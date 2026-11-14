from datetime import datetime, timedelta, timezone

import jwt

from app import models, security
from app.config import settings

from .conftest import MEETING, PASSWORD, login, make_task, register


# ---------- регистрация ----------
def test_register_returns_user_without_password(anon):
    response = register(anon, "New@Example.com")
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"  # email приводится к нижнему регистру
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_email_is_409(anon):
    assert register(anon, "a@example.com").status_code == 201
    response = register(anon, "A@example.com")
    assert response.status_code == 409
    assert "уже существует" in response.json()["detail"]


def test_register_invalid_data_is_422(anon):
    assert register(anon, "not-an-email").status_code == 422
    assert register(anon, "a@example.com", password="short").status_code == 422
    assert register(anon, "a@example.com", name=" ").status_code == 422


def test_password_is_stored_as_argon2_hash(anon, session_factory):
    register(anon, "a@example.com")
    with session_factory() as db:
        user = db.query(models.User).one()
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$argon2id$")
    assert PASSWORD not in user.password_hash


# ---------- вход ----------
def test_login_returns_two_tokens(anon):
    register(anon, "a@example.com")
    response = login(anon, "a@example.com")
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == settings.access_token_expire_minutes * 60
    assert body["access_token"] and body["refresh_token"]
    assert body["access_token"] != body["refresh_token"]


def test_access_token_is_jwt_with_expiry(anon):
    register(anon, "a@example.com")
    token = login(anon, "a@example.com").json()["access_token"]
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    assert payload["type"] == "access"
    assert 0 < payload["exp"] - payload["iat"] <= settings.access_token_expire_minutes * 60


def test_login_wrong_credentials_is_401(anon):
    register(anon, "a@example.com")
    wrong_password = login(anon, "a@example.com", "wrong-password-1")
    unknown_user = login(anon, "nobody@example.com")
    assert wrong_password.status_code == unknown_user.status_code == 401
    # Сообщения одинаковы: по ним нельзя узнать, зарегистрирован ли email
    assert wrong_password.json() == unknown_user.json()


# ---------- защита маршрутов ----------
def test_health_and_auth_endpoints_are_public(anon):
    assert anon.get("/health").status_code == 200
    assert register(anon, "a@example.com").status_code == 201


def test_private_endpoints_require_token(anon):
    for method, url in [
        ("get", "/meetings"),
        ("post", "/meetings"),
        ("get", "/meetings/1"),
        ("get", "/tasks"),
        ("post", "/tasks"),
        ("patch", "/tasks/1"),
        ("delete", "/tasks/1"),
        ("get", "/auth/me"),
    ]:
        response = getattr(anon, method)(url)
        assert response.status_code == 401, (method, url)
        assert response.headers["www-authenticate"] == "Bearer"


def test_me_returns_current_user(client):
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_garbage_token_is_401(anon):
    response = anon.get("/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


def test_expired_access_token_is_401(anon):
    register(anon, "a@example.com")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": "1", "type": "access", "iat": now - timedelta(hours=1), "exp": now - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm="HS256",
    )
    response = anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "истёк" in response.json()["detail"]


def test_token_signed_with_other_key_is_401(anon):
    register(anon, "a@example.com")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": "1", "type": "access", "exp": now + timedelta(minutes=5)},
        "x" * 40,
        algorithm="HS256",
    )
    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_unsigned_alg_none_token_is_401(anon):
    register(anon, "a@example.com")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": "1", "type": "access", "exp": now + timedelta(minutes=5)}, None, algorithm="none"
    )
    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_refresh_token_cannot_be_used_as_access_token(anon):
    register(anon, "a@example.com")
    refresh_token = login(anon, "a@example.com").json()["refresh_token"]
    response = anon.get("/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert response.status_code == 401


def test_other_token_type_is_rejected(anon):
    register(anon, "a@example.com")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": "1", "type": "refresh", "exp": now + timedelta(minutes=5)},
        settings.jwt_secret_key,
        algorithm="HS256",
    )
    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# ---------- refresh ----------
def test_refresh_issues_new_pair_and_rotates(anon):
    register(anon, "a@example.com")
    first = login(anon, "a@example.com").json()

    response = anon.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert response.status_code == 200
    second = response.json()
    assert second["refresh_token"] != first["refresh_token"]

    me = anon.get("/auth/me", headers={"Authorization": f"Bearer {second['access_token']}"})
    assert me.status_code == 200

    # Использованный refresh token отозван
    again = anon.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert again.status_code == 401
    assert "отозван" in again.json()["detail"]
    # а новый работает
    assert anon.post("/auth/refresh", json={"refresh_token": second["refresh_token"]}).status_code == 200


def test_refresh_with_unknown_token_is_401(anon):
    response = anon.post("/auth/refresh", json={"refresh_token": "unknown"})
    assert response.status_code == 401


def test_refresh_with_access_token_is_401(anon):
    register(anon, "a@example.com")
    tokens = login(anon, "a@example.com").json()
    response = anon.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert response.status_code == 401


def test_refresh_with_expired_token_is_401(anon, session_factory):
    register(anon, "a@example.com")
    token = login(anon, "a@example.com").json()["refresh_token"]
    with session_factory() as db:
        row = db.query(models.RefreshToken).one()
        row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    response = anon.post("/auth/refresh", json={"refresh_token": token})
    assert response.status_code == 401
    assert "истёк" in response.json()["detail"]


def test_refresh_without_body_is_422(anon):
    assert anon.post("/auth/refresh", json={}).status_code == 422


def test_refresh_tokens_are_stored_hashed(anon, session_factory):
    register(anon, "a@example.com")
    token = login(anon, "a@example.com").json()["refresh_token"]
    with session_factory() as db:
        row = db.query(models.RefreshToken).one()
    assert row.token_hash == security.hash_refresh_token(token)
    assert token not in row.token_hash


# ---------- выход ----------
def test_logout_revokes_only_current_session(anon):
    register(anon, "a@example.com")
    session_1 = login(anon, "a@example.com").json()
    session_2 = login(anon, "a@example.com").json()

    assert anon.post("/auth/logout", json={"refresh_token": session_1["refresh_token"]}).status_code == 204

    assert anon.post("/auth/refresh", json={"refresh_token": session_1["refresh_token"]}).status_code == 401
    # другая сессия (например, другое устройство) продолжает работать
    assert anon.post("/auth/refresh", json={"refresh_token": session_2["refresh_token"]}).status_code == 200


def test_logout_is_idempotent(anon):
    register(anon, "a@example.com")
    token = login(anon, "a@example.com").json()["refresh_token"]
    assert anon.post("/auth/logout", json={"refresh_token": token}).status_code == 204
    assert anon.post("/auth/logout", json={"refresh_token": token}).status_code == 204
    assert anon.post("/auth/logout", json={"refresh_token": "unknown"}).status_code == 204


# ---------- авторизация: чужие данные ----------
def test_meeting_is_owned_by_creator(client, other_client):
    created = client.post("/meetings", json=MEETING).json()
    url = f"/meetings/{created['id']}"

    assert other_client.get(url).status_code == 403
    assert other_client.patch(url, json={"title": "Взлом"}).status_code == 403
    assert other_client.delete(url).status_code == 403
    # данные не изменились
    assert client.get(url).json()["title"] == MEETING["title"]


def test_meeting_list_contains_only_own(client, other_client):
    client.post("/meetings", json=MEETING)
    other_client.post("/meetings", json={**MEETING, "title": "Чужое"})

    own = client.get("/meetings").json()
    assert [m["title"] for m in own] == [MEETING["title"]]
    assert own[0]["agenda_count"] == 3 and own[0]["decisions_count"] == 1
    assert [m["title"] for m in other_client.get("/meetings").json()] == ["Чужое"]


def test_cannot_create_task_in_foreign_meeting(client, other_client):
    meeting = client.post("/meetings", json=MEETING).json()
    response = make_task(other_client, meeting["id"])
    assert response.status_code == 403
    assert client.get("/tasks").json() == []


def test_tasks_of_other_users_are_hidden_and_protected(client, other_client):
    meeting = client.post("/meetings", json=MEETING).json()
    task = make_task(client, meeting["id"]).json()
    url = f"/tasks/{task['id']}"

    assert other_client.get("/tasks").json() == []
    assert other_client.get("/tasks", params={"meeting_id": meeting["id"]}).json() == []
    assert other_client.get(url).status_code == 403
    assert other_client.patch(url, json={"status": "done"}).status_code == 403
    assert other_client.delete(url).status_code == 403
    assert client.get(url).json()["status"] == "in_progress"


def test_missing_resources_are_still_404_for_authorized_user(client):
    assert client.get("/meetings/9999").status_code == 404
    assert client.get("/tasks/9999").status_code == 404
