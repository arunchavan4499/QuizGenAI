from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from db.database import get_db
from . import oauth2
from app.schemas import AuthUserResponse

DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[AuthUserResponse, Depends(oauth2.get_current_user)]
PasswordRequestForm = Annotated[OAuth2PasswordRequestForm, Depends()]
