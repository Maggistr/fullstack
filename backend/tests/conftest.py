import os

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-characters-long")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from argon2 import PasswordHasher

from app import security
from app.database import Base, get_db
from app.main import app

# Облегчённые параметры argon2 только для тестов, чтобы они шли быстро
security._hasher = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False)
    engine.dispose()


@pytest.fixture()
def _app(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield app
    app.dependency_overrides.clear()


def new_client(app_, email=None) -> TestClient:
    """Клиент без заголовков; если задан email — регистрируется и входит под этим пользователем."""
    # Без "with": жизненный цикл приложения (create_all на PostgreSQL) не запускается
    c = TestClient(app_)
    if email:
        register(c, email)
        tokens = login(c, email).json()
        c.headers["Authorization"] = f"Bearer {tokens['access_token']}"
    return c


PASSWORD = "correct-horse-1"


def register(client, email, password=PASSWORD, name="Тестовый Пользователь"):
    return client.post("/auth/register", json={"email": email, "password": password, "name": name})


def login(client, email, password=PASSWORD):
    # OAuth2: поле username содержит email, данные отправляются формой
    return client.post("/auth/login", data={"username": email, "password": password})


@pytest.fixture()
def anon(_app):
    """Клиент без авторизации."""
    return new_client(_app)


@pytest.fixture()
def client(_app):
    """Клиент, вошедший как пользователь alice (основной в тестах)."""
    return new_client(_app, "alice@example.com")


@pytest.fixture()
def other_client(_app):
    """Клиент, вошедший как другой пользователь bob."""
    return new_client(_app, "bob@example.com")


MEETING = {
    "title": "Планирование спринта",
    "date": "2026-10-05",
    "summary": "Обсудили цели",
    "agenda": ["Итоги", "Цели", "Задачи"],
    "decisions": ["Релиз 20 октября"],
}


@pytest.fixture()
def meeting(client):
    response = client.post("/meetings", json=MEETING)
    assert response.status_code == 201
    return response.json()


def make_task(client, meeting_id, **overrides):
    data = {
        "meeting_id": meeting_id,
        "title": "Подготовить макеты",
        "assignee": "Анна",
        "deadline": "2026-10-10",
    }
    data.update(overrides)
    return client.post("/tasks", json=data)