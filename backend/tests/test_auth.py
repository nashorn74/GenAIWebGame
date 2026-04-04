import json


def test_register_success(client):
    resp = client.post("/auth/register", json={
        "username": "test1234",
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["user"]["username"] == "test1234"


def test_register_duplicate(client):
    payload = {"username": "dup12345", "password": "abcd1234", "password_confirm": "abcd1234"}
    client.post("/auth/register", json=payload)
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already exists" in resp.get_json()["error"]


def test_register_password_mismatch(client):
    resp = client.post("/auth/register", json={
        "username": "mismatch",
        "password": "abcd1234",
        "password_confirm": "xxxx5678",
    })
    assert resp.status_code == 400
    assert "do not match" in resp.get_json()["error"]


def test_register_invalid_username(client):
    resp = client.post("/auth/register", json={
        "username": "AB",  # too short, uppercase
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    assert resp.status_code == 400


def test_register_invalid_password(client):
    resp = client.post("/auth/register", json={
        "username": "validuser",
        "password": "short",  # too short, no digits
        "password_confirm": "short",
    })
    assert resp.status_code == 400


def test_login_success(client):
    client.post("/auth/register", json={
        "username": "login123",
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    resp = client.post("/auth/login", json={
        "username": "login123",
        "password": "abcd1234",
    })
    assert resp.status_code == 200
    assert resp.get_json()["user"]["username"] == "login123"


def test_login_wrong_password(client):
    client.post("/auth/register", json={
        "username": "login456",
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    resp = client.post("/auth/login", json={
        "username": "login456",
        "password": "wrongpass1",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/auth/login", json={
        "username": "noexist1",
        "password": "abcd1234",
    })
    assert resp.status_code == 401
