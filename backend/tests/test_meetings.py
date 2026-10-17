from .conftest import MEETING


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_create_meeting_with_agenda_and_decisions(client):
    response = client.post("/meetings", json=MEETING)
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["agenda"] == MEETING["agenda"]
    assert body["decisions"] == MEETING["decisions"]
    assert body["tasks"] == []


def test_list_and_read_meeting(client, meeting):
    listing = client.get("/meetings")
    assert listing.status_code == 200
    assert [m["id"] for m in listing.json()] == [meeting["id"]]

    one = client.get(f"/meetings/{meeting['id']}")
    assert one.status_code == 200
    assert one.json()["title"] == MEETING["title"]


def test_meeting_not_found(client):
    response = client.get("/meetings/9999")
    assert response.status_code == 404
    assert "9999" in response.json()["detail"]


def test_non_numeric_id_is_422(client):
    assert client.get("/meetings/abc").status_code == 422


def test_invalid_meeting_data_is_422(client):
    assert client.post("/meetings", json={**MEETING, "title": "   "}).status_code == 422
    assert client.post("/meetings", json={**MEETING, "date": "не дата"}).status_code == 422
    assert client.post("/meetings", json={"title": "Без даты"}).status_code == 422
    assert client.post("/meetings", json={**MEETING, "agenda": [""]}).status_code == 422


def test_patch_meeting_replaces_lists(client, meeting):
    response = client.patch(
        f"/meetings/{meeting['id']}",
        json={"title": "Новое название", "agenda": ["Единственный пункт"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Новое название"
    assert body["agenda"] == ["Единственный пункт"]
    # поля, которые не передавали, не изменились
    assert body["decisions"] == MEETING["decisions"]


def test_patch_meeting_null_is_422_not_500(client, meeting):
    url = f"/meetings/{meeting['id']}"
    assert client.patch(url, json={"title": None}).status_code == 422
    assert client.patch(url, json={"date": None}).status_code == 422
    assert client.patch(url, json={"agenda": None}).status_code == 422


def test_patch_meeting_can_clear_audio_path(client, meeting):
    url = f"/meetings/{meeting['id']}"
    assert client.patch(url, json={"audio_path": "a.mp3"}).json()["audio_path"] == "a.mp3"
    assert client.patch(url, json={"audio_path": None}).json()["audio_path"] is None


def test_patch_missing_meeting_is_404(client):
    assert client.patch("/meetings/9999", json={"title": "x"}).status_code == 404


def test_delete_meeting(client, meeting):
    url = f"/meetings/{meeting['id']}"
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert client.delete(url).status_code == 404