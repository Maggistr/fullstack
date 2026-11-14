from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, models, schemas, security
from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user, unauthorized

router = APIRouter(prefix="/auth", tags=["auth"])


def _aware(value: datetime) -> datetime:
    # SQLite возвращает время без часового пояса; в PostgreSQL оно уже с поясом
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _issue_tokens(db: Session, user: models.User) -> schemas.TokenPair:
    refresh_token = security.generate_refresh_token()
    crud.create_refresh_token(
        db,
        user.id,
        security.hash_refresh_token(refresh_token),
        security.refresh_token_expiry(),
    )
    return schemas.TokenPair(
        access_token=security.create_access_token(user.id),
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, data.email) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует")
    try:
        return crud.create_user(db, data.email, data.name, security.hash_password(data.password))
    except IntegrityError:  # два одновременных запроса с одним email
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует"
        ) from None


@router.post("/login", response_model=schemas.TokenPair)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Вход по email и паролю. Поле формы `username` — это email (так требует OAuth2 и Swagger UI)."""
    user = crud.get_user_by_email(db, form.username)
    if not security.verify_password(form.password, user.password_hash if user else None):
        raise unauthorized("Неверный email или пароль")
    crud.delete_expired_refresh_tokens(db, user.id)
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=schemas.TokenPair)
def refresh(data: schemas.RefreshRequest, db: Session = Depends(get_db)):
    """Обмен refresh token на новую пару токенов. Использованный refresh token отзывается."""
    stored = crud.get_refresh_token(db, security.hash_refresh_token(data.refresh_token))
    if stored is None:
        raise unauthorized("Некорректный refresh token")
    if stored.revoked_at is not None:
        raise unauthorized("Refresh token отозван")
    if _aware(stored.expires_at) <= datetime.now(timezone.utc):
        raise unauthorized("Срок действия refresh token истёк")

    user = crud.get_user(db, stored.user_id)
    if user is None:
        raise unauthorized("Пользователь не найден")
    crud.revoke_refresh_token(db, stored)
    return _issue_tokens(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: schemas.RefreshRequest, db: Session = Depends(get_db)):
    """Завершает текущую сессию: её refresh token больше не обновляет access token.
    Запрос идемпотентен: неизвестный или уже отозванный токен тоже даёт 204."""
    stored = crud.get_refresh_token(db, security.hash_refresh_token(data.refresh_token))
    if stored is not None:
        crud.revoke_refresh_token(db, stored)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
