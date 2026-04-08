def test_create_map(admin_client):
    resp = admin_client.post("/api/maps", json={
        "key": "testmap",
        "display_name": "Test Map",
        "tile_width": 64,
        "tile_height": 64,
    })
    assert resp.status_code == 201
    assert resp.get_json()["map"]["key"] == "testmap"


def test_list_maps(admin_client):
    admin_client.post("/api/maps", json={"key": "m1", "display_name": "Map1"})
    admin_client.post("/api/maps", json={"key": "m2", "display_name": "Map2"})
    resp = admin_client.get("/api/maps")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2


def test_get_map(admin_client):
    admin_client.post("/api/maps", json={"key": "getmap", "display_name": "Get"})
    resp = admin_client.get("/api/maps/getmap")
    assert resp.status_code == 200
    assert resp.get_json()["display_name"] == "Get"


def test_update_map(admin_client):
    admin_client.post("/api/maps", json={"key": "updmap", "display_name": "Old"})
    resp = admin_client.put("/api/maps/updmap", json={"display_name": "New"})
    assert resp.status_code == 200
    assert resp.get_json()["map"]["display_name"] == "New"


def test_delete_map(admin_client):
    admin_client.post("/api/maps", json={"key": "delmap", "display_name": "Del"})
    resp = admin_client.delete("/api/maps/delmap")
    assert resp.status_code == 200
    resp = admin_client.get("/api/maps/delmap")
    assert resp.status_code == 404


def test_create_map_requires_admin(client):
    """미인증 요청은 401 반환"""
    resp = client.post("/api/maps", json={"key": "hack", "display_name": "Hack"})
    assert resp.status_code == 401
