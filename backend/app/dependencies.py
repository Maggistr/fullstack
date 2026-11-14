from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import crud, models, security
from .database import get_db

# tokenUrl нужен для кнопки Authorize в Swagger UI
# auto_error=False: ответ 401 на русском формируем сами
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
    )


def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    if not token:
        raise unauthorized("Требуется авторизация")
    try:
        user_id = security.decode_access_token(token)
    except security.TokenError as e:
        raise unauthorized(e.message) from None
    user = crud.get_user(db, user_id)
    if user is None:
        raise unauthorized("Пользователь не найден")
    return user
