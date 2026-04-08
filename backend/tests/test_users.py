def _create_user(client, username="admin001"):
    reg = client.post("/auth/register", json={
        "username": username,
        "password": "abcd1234",
        "password_confirm": "abcd1234",
    })
    assert reg.status_code == 201, f"Registration failed: {reg.get_json()}"
    return client.get("/api/users").get_json()[-1]["id"]


def test_list_users(client):
    _create_user(client, "list0001")
    resp = client.get("/api/users")
    assert resp.status_code == 200
    assert len(resp.get_json()) >= 1


def test_get_user(client):
    uid = _create_user(client, "getuser1")
    resp = client.get(f"/api/users/{uid}")
    assert resp.status_code == 200
    assert resp.get_json()["username"] == "getuser1"


def test_update_user(admin_client):
    uid = _create_user(admin_client, "upduser1")
    resp = admin_client.put(f"/api/users/{uid}", json={"bio": "Hello"})
    assert resp.status_code == 200
    assert resp.get_json()["user"]["bio"] == "Hello"


def test_delete_user(admin_client):
    uid = _create_user(admin_client, "deluser1")
    resp = admin_client.delete(f"/api/users/{uid}")
    assert resp.status_code == 200
    resp = admin_client.get(f"/api/users/{uid}")
    assert resp.status_code == 404


def test_ban_user(admin_client):
    uid = _create_user(admin_client, "banuser1")
    resp = admin_client.post(f"/api/users/{uid}/ban")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "banned"


def test_ban_already_banned(admin_client):
    uid = _create_user(admin_client, "ban2user")
    admin_client.post(f"/api/users/{uid}/ban")
    resp = admin_client.post(f"/api/users/{uid}/ban")
    assert resp.status_code == 400


def test_unban_user(admin_client):
    uid = _create_user(admin_client, "unbanuse")
    admin_client.post(f"/api/users/{uid}/ban")
    resp = admin_client.post(f"/api/users/{uid}/unban")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "active"


def test_unban_not_banned(admin_client):
    uid = _create_user(admin_client, "noban001")
    resp = admin_client.post(f"/api/users/{uid}/unban")
    assert resp.status_code == 400


def test_update_user_requires_admin(client):
    """미인증 요청은 401 반환"""
    uid = _create_user(client, "noadmin1")
    resp = client.put(f"/api/users/{uid}", json={"bio": "Hack"})
    assert resp.status_code == 401
