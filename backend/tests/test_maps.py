def test_create_map(client):
    resp = client.post("/api/maps", json={
        "key": "testmap",
        "display_name": "Test Map",
        "tile_width": 64,
        "tile_height": 64,
    })
    assert resp.status_code == 201
    assert resp.get_json()["map"]["key"] == "testmap"


def test_list_maps(client):
    client.post("/api/maps", json={"key": "m1", "display_name": "Map1"})
    client.post("/api/maps", json={"key": "m2", "display_name": "Map2"})
    resp = client.get("/api/maps")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2


def test_get_map(client):
    client.post("/api/maps", json={"key": "getmap", "display_name": "Get"})
    resp = client.get("/api/maps/getmap")
    assert resp.status_code == 200
    assert resp.get_json()["display_name"] == "Get"


def test_update_map(client):
    client.post("/api/maps", json={"key": "updmap", "display_name": "Old"})
    resp = client.put("/api/maps/updmap", json={"display_name": "New"})
    assert resp.status_code == 200
    assert resp.get_json()["map"]["display_name"] == "New"


def test_delete_map(client):
    client.post("/api/maps", json={"key": "delmap", "display_name": "Del"})
    resp = client.delete("/api/maps/delmap")
    assert resp.status_code == 200
    resp = client.get("/api/maps/delmap")
    assert resp.status_code == 404
