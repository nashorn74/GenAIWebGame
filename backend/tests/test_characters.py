import pytest
from models import db, User


def _register(client, username="charuser1"):
    reg = client.post("/auth/register", json={
        "username": username,
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    assert reg.status_code == 201, f"Registration failed: {reg.get_json()}"
    login = client.post("/auth/login", json={
        "username": username,
        "password": "abcd1234",
    })
    assert login.status_code == 200, f"Login failed: {login.get_json()}"
    return login.get_json()["user"]["id"]


def test_create_warrior(client):
    uid = _register(client)
    resp = client.post("/api/characters", json={
        "user_id": uid, "name": "WarriorA", "job": "warrior",
    })
    assert resp.status_code == 201
    c = resp.get_json()["character"]
    assert c["job"] == "warrior"
    assert c["hp"] == 120
    assert c["mp"] == 50


def test_create_mage(client):
    uid = _register(client, "mageuser1")
    resp = client.post("/api/characters", json={
        "user_id": uid, "name": "MageA", "job": "mage",
    })
    assert resp.status_code == 201
    c = resp.get_json()["character"]
    assert c["hp"] == 80
    assert c["mp"] == 80


def test_create_archer(client):
    uid = _register(client, "archuser1")
    resp = client.post("/api/characters", json={
        "user_id": uid, "name": "ArcherA", "job": "archer",
    })
    assert resp.status_code == 201
    c = resp.get_json()["character"]
    assert c["hp"] == 100
    assert c["mp"] == 60


def test_max_slot_limit(client):
    uid = _register(client, "slotuser1")
    for i in range(3):
        resp = client.post("/api/characters", json={
            "user_id": uid, "name": f"Slot{i}", "job": "warrior",
        })
        assert resp.status_code == 201
    resp = client.post("/api/characters", json={
        "user_id": uid, "name": "Slot3", "job": "warrior",
    })
    assert resp.status_code == 400
    assert "limit" in resp.get_json()["error"].lower()


def test_duplicate_name(client):
    uid = _register(client, "dupname01")
    client.post("/api/characters", json={
        "user_id": uid, "name": "UniqueName", "job": "warrior",
    })
    resp = client.post("/api/characters", json={
        "user_id": uid, "name": "UniqueName", "job": "warrior",
    })
    assert resp.status_code == 400
    assert "already exists" in resp.get_json()["error"]


def test_list_characters(client):
    uid = _register(client, "listuser1")
    client.post("/api/characters", json={
        "user_id": uid, "name": "ListChar", "job": "warrior",
    })
    resp = client.get(f"/api/characters?user_id={uid}")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1


def test_get_character(client):
    uid = _register(client, "getuser01")
    cid = client.post("/api/characters", json={
        "user_id": uid, "name": "GetChar", "job": "warrior",
    }).get_json()["character"]["id"]
    resp = client.get(f"/api/characters/{cid}")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "GetChar"


def test_update_character(client):
    uid = _register(client, "upduser01")
    cid = client.post("/api/characters", json={
        "user_id": uid, "name": "UpdChar", "job": "warrior",
    }).get_json()["character"]["id"]
    resp = client.put(f"/api/characters/{cid}", json={"name": "NewName01"})
    assert resp.status_code == 200
    assert resp.get_json()["character"]["name"] == "NewName01"


def test_delete_character(client):
    uid = _register(client, "deluser01")
    cid = client.post("/api/characters", json={
        "user_id": uid, "name": "DelChar", "job": "warrior",
    }).get_json()["character"]["id"]
    resp = client.delete(f"/api/characters/{cid}")
    assert resp.status_code == 200
    resp = client.get(f"/api/characters/{cid}")
    assert resp.status_code == 404


def test_gain_exp(client):
    uid = _register(client, "expuser01")
    cid = client.post("/api/characters", json={
        "user_id": uid, "name": "ExpChar", "job": "warrior",
    }).get_json()["character"]["id"]
    resp = client.patch(f"/api/characters/{cid}/gain_exp", json={"amount": 100})
    assert resp.status_code == 200
    c = resp.get_json()["character"]
    assert c["level"] == 2


def test_update_stats(client):
    uid = _register(client, "statuser1")
    cid = client.post("/api/characters", json={
        "user_id": uid, "name": "StatChar", "job": "warrior",
    }).get_json()["character"]["id"]
    resp = client.patch(f"/api/characters/{cid}/stats", json={
        "hp": 50, "str": 20, "dex": 15,
    })
    assert resp.status_code == 200
    c = resp.get_json()["character"]
    assert c["hp"] == 50
    assert c["str"] == 20
    assert c["dex"] == 15
