"""Хеширование паролей и токены. Здесь нет обращений к БД и к HTTP."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from .config import settings

# argon2id с параметрами по умолчанию — алгоритм, предназначенный для хранения паролей
_hasher = PasswordHasher()
# Хеш для сравнения, когда пользователь не найден: время ответа не выдаёт, существует ли email
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")

ACCESS_TOKEN_TYPE = "access"


class TokenError(Exception):
    """Access token некорректен или истёк."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        _hasher.verify(password_hash or _DUMMY_HASH, password)
    except (VerificationError, InvalidHashError):
        return False
    return password_hash is not None


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


# ---------- access token (JWT) ----------
def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    """Возвращает id пользователя или бросает TokenError."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise TokenError("Срок действия токена истёк") from None
    except jwt.InvalidTokenError:
        raise TokenError("Некорректный токен") from None

    if payload["type"] != ACCESS_TOKEN_TYPE:
        raise TokenError("Некорректный токен")
    try:
        return int(payload["sub"])
    except (TypeError, ValueError):
        raise TokenError("Некорректный токен") from None


# ---------- refresh token (случайная строка, в БД — только хеш) ----------
def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    # Токен имеет высокую энтропию, поэтому достаточно SHA-256 (медленный хеш здесь не нужен)
    return hashlib.sha256(token.encode()).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
