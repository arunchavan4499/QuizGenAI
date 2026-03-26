from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api import deps
from app.models.schemas import AuthLoginRequest, AuthRegisterRequest, AuthTokenResponse, AuthUserResponse
from app.services.auth_service import AuthError, login_user, register_user, revoke_token

router = APIRouter()


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest) -> AuthUserResponse:
    try:
        return register_user(name=payload.name, email=payload.email, password=payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest) -> AuthTokenResponse:
    try:
        return login_user(payload)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get("/me", response_model=AuthUserResponse)
def me(current_user: deps.CurrentUser) -> AuthUserResponse:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(token: str = Depends(deps._extract_bearer_token)) -> Response:
    try:
        revoke_token(token)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
