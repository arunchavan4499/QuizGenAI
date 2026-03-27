from fastapi import APIRouter, Depends, HTTPException, Response, status

from app import deps
from app import oauth2
from app.schemas import AuthLoginRequest, AuthRegisterRequest, AuthTokenResponse, AuthUserResponse, ProfileResponse, ProfileUpdateRequest
from app.services.auth_service import (
    AuthError,
    get_user_profile,
    login_user,
    register_user,
    revoke_token,
    update_user_profile,
)

router = APIRouter()


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest, db: deps.DBSession) -> AuthUserResponse:
    try:
        return register_user(name=payload.name, email=payload.email, password=payload.password, db=db)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=AuthTokenResponse)
def login(form_data: deps.PasswordRequestForm) -> AuthTokenResponse:
    try:
        return login_user(AuthLoginRequest(email=form_data.username, password=form_data.password))
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get("/me", response_model=AuthUserResponse)
def me(current_user: deps.CurrentUser) -> AuthUserResponse:
    return current_user


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: deps.CurrentUser, db: deps.DBSession) -> ProfileResponse:
    try:
        return get_user_profile(user_id=current_user.id, db=db)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/profile", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdateRequest, current_user: deps.CurrentUser, db: deps.DBSession) -> ProfileResponse:
    try:
        return update_user_profile(user_id=current_user.id, payload=payload, db=db)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(token: str = Depends(oauth2.oauth2_scheme)) -> Response:
    try:
        revoke_token(token)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
