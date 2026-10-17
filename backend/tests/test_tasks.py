from app import models

from .conftest import make_task


def test_create_task(client, meeting):
    response = make_task(client, meeting["id"])
    assert response.status_code == 201
    body = response.json()
    assert body["meeting_id"] == meeting["id"]
    assert body["status"] == "in_progress"


def test_task_appears_in_meeting(client, meeting):
    make_task(client, meeting["id"])
    tasks = client.get(f"/meetings/{meeting['id']}").json()["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["assignee"] == "Анна"


def test_create_task_for_missing_meeting_is_404(client):
    response = make_task(client, 9999)
    assert response.status_code == 404
    assert "9999" in response.json()["detail"]


def test_invalid_task_data_is_422(client, meeting):
    mid = meeting["id"]
    assert make_task(client, mid, status="unknown").status_code == 422
    assert make_task(client, mid, deadline="вчера").status_code == 422
    assert make_task(client, mid, title="").status_code == 422
    assert make_task(client, mid, assignee="  ").status_code == 422


def test_filter_tasks(client, meeting):
    first = make_task(client, meeting["id"], title="A").json()
    make_task(client, meeting["id"], title="B", status="done")

    done = client.get("/tasks", params={"status": "done"}).json()
    assert [t["title"] for t in done] == ["B"]

    by_meeting = client.get("/tasks", params={"meeting_id": meeting["id"]}).json()
    assert len(by_meeting) == 2
    assert first["id"] in [t["id"] for t in by_meeting]

    assert client.get("/tasks", params={"status": "bad"}).status_code == 422


def test_patch_task(client, meeting):
    task = make_task(client, meeting["id"]).json()
    response = client.patch(f"/tasks/{task['id']}", json={"status": "done"})
    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["title"] == task["title"]


def test_patch_task_null_is_422_not_500(client, meeting):
    task = make_task(client, meeting["id"]).json()
    url = f"/tasks/{task['id']}"
    for field in ("title", "assignee", "deadline", "status"):
        assert client.patch(url, json={field: None}).status_code == 422


def test_task_not_found(client):
    assert client.get("/tasks/9999").status_code == 404
    assert client.patch("/tasks/9999", json={"status": "done"}).status_code == 404
    assert client.delete("/tasks/9999").status_code == 404


def test_delete_task(client, meeting):
    task = make_task(client, meeting["id"]).json()
    assert client.delete(f"/tasks/{task['id']}").status_code == 204
    assert client.get(f"/tasks/{task['id']}").status_code == 404


def test_cascade_delete_removes_related_rows(client, session_factory, meeting):
    make_task(client, meeting["id"])
    assert client.delete(f"/meetings/{meeting['id']}").status_code == 204

    with session_factory() as db:
        assert db.query(models.AgendaItem).count() == 0
        assert db.query(models.Decision).count() == 0
        assert db.query(models.Task).count() == 0