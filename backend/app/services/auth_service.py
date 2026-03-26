from datetime import UTC, datetime, timedelta
import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
from jwt import InvalidTokenError
from sqlalchemy import select

from app.models.schemas import AuthLoginRequest, AuthTokenResponse, AuthUserResponse
from db.config import settings
from db.database import SessionLocal
from db.models import AuthToken, User

password_hasher = PasswordHasher()


class AuthError(RuntimeError):
    pass


def _build_token(user: User) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_time)
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_at


def register_user(name: str, email: str, password: str) -> AuthUserResponse:
    session = SessionLocal()
    try:
        existing = session.execute(select(User.id).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            raise AuthError("Email already registered.")

        user = User(
            id=f"user_{uuid.uuid4().hex[:12]}",
            name=name,
            email=email,
            password_hash=password_hasher.hash(password),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return AuthUserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at)
    finally:
        session.close()


def login_user(payload: AuthLoginRequest) -> AuthTokenResponse:
    session = SessionLocal()
    try:
        user = session.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if user is None:
            raise AuthError("Invalid email or password.")

        try:
            password_hasher.verify(user.password_hash, payload.password)
        except VerifyMismatchError as exc:
            raise AuthError("Invalid email or password.") from exc

        token, expires_at = _build_token(user)
        session.add(AuthToken(user_id=user.id, token=token))
        session.commit()

        return AuthTokenResponse(
            access_token=token,
            token_type="bearer",
            expires_at=expires_at,
            user=AuthUserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at),
        )
    finally:
        session.close()


def get_current_user(token: str) -> AuthUserResponse:
    session = SessionLocal()
    try:
        try:
            decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        except InvalidTokenError as exc:
            raise AuthError("Invalid or expired token.") from exc

        user_id = decoded.get("sub")
        if not user_id:
            raise AuthError("Invalid token payload.")

        active_token = session.execute(select(AuthToken.id).where(AuthToken.token == token)).scalar_one_or_none()
        if active_token is None:
            raise AuthError("Token is not active.")

        user = session.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user is None:
            raise AuthError("User not found.")

        return AuthUserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at)
    finally:
        session.close()


def revoke_token(token: str) -> None:
    session = SessionLocal()
    try:
        token_row = session.execute(select(AuthToken).where(AuthToken.token == token)).scalar_one_or_none()
        if token_row is None:
            raise AuthError("Token is not active.")

        session.delete(token_row)
        session.commit()
    finally:
        session.close()
