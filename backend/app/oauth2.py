from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app import exceptions
from app.schemas import AuthUserResponse
from app.services.auth_service import AuthError, get_current_user as get_current_user_from_service

# Keep OAuth2 flow with Swagger support targeting /auth/login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> AuthUserResponse:
    try:
        return get_current_user_from_service(token)
    except AuthError:
        raise exceptions.credentials_exception
