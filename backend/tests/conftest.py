import os

os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


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
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Без "with": жизненный цикл приложения (create_all на PostgreSQL) не запускается
    yield TestClient(app)
    app.dependency_overrides.clear()


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