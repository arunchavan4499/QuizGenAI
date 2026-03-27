from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
from jwt import InvalidTokenError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.schemas import AuthLoginRequest, AuthTokenResponse, AuthUserResponse, ProfileResponse, ProfileUpdateRequest
from db.config import settings
from db.database import SessionLocal
from db.models import AuthToken, User

password_hasher = PasswordHasher()


class AuthError(RuntimeError):
    pass


def _build_token(user: User) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_time)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_at


def _next_numeric_user_id(db: Session) -> int:
    # Compatible with existing string IDs by using only purely numeric IDs.
    current_max = db.execute(
        text(
            """
            SELECT COALESCE(MAX(
                CASE
                    WHEN id::text ~ '^[0-9]+$' THEN id::text::int
                    ELSE 0
                END
            ), 0)
            FROM users
            """
        )
    ).scalar_one()
    return int(current_max) + 1


def register_user(name: str, email: str, password: str, db: Session) -> AuthUserResponse:
    try:
        existing = db.execute(select(User.id).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            raise AuthError("Email already registered.")

        next_id = _next_numeric_user_id(db)
        user = User(
            id=str(next_id),
            name=name,
            email=email,
            password_hash=password_hasher.hash(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return AuthUserResponse(id=next_id, name=user.name, email=user.email, created_at=user.created_at)
    finally:
        db.close()


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
            user=AuthUserResponse(id=int(user.id), name=user.name, email=user.email, created_at=user.created_at),
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

        user = session.execute(select(User).where(User.id == str(user_id))).scalar_one_or_none()
        if user is None:
            raise AuthError("User not found.")

        return AuthUserResponse(id=int(user.id), name=user.name, email=user.email, created_at=user.created_at)
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


def get_user_profile(user_id: int, db: Session) -> ProfileResponse:
    user = db.execute(select(User).where(User.id == str(user_id))).scalar_one_or_none()
    if user is None:
        raise AuthError("User not found.")

    return ProfileResponse(
        name=user.name,
        email=user.email,
        phone=user.phone or "",
        location=user.location or "",
        classYear=user.class_year or "",
        bio=user.bio or "",
        photoUrl=user.photo_url or "",
    )


def update_user_profile(user_id: int, payload: ProfileUpdateRequest, db: Session) -> ProfileResponse:
    user = db.execute(select(User).where(User.id == str(user_id))).scalar_one_or_none()
    if user is None:
        raise AuthError("User not found.")

    user.name = payload.name.strip()
    user.email = str(payload.email).strip().lower()
    user.phone = (payload.phone or "").strip() or None
    user.location = (payload.location or "").strip() or None
    user.class_year = (payload.classYear or "").strip() or None
    user.bio = (payload.bio or "").strip() or None
    user.photo_url = payload.photoUrl or None

    db.add(user)
    db.commit()
    db.refresh(user)

    return ProfileResponse(
        name=user.name,
        email=user.email,
        phone=user.phone or "",
        location=user.location or "",
        classYear=user.class_year or "",
        bio=user.bio or "",
        photoUrl=user.photo_url or "",
    )
