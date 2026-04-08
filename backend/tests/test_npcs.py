def test_create_npc(admin_client):
    resp = admin_client.post("/api/npcs", json={
        "name": "Guard", "job": "Guard", "map_key": "city2",
        "x": 5, "y": 10, "dialog": "Hello!",
    })
    assert resp.status_code == 201
    assert resp.get_json()["npc"]["name"] == "Guard"


def test_list_npcs(admin_client):
    admin_client.post("/api/npcs", json={"name": "NPC1", "map_key": "city2"})
    admin_client.post("/api/npcs", json={"name": "NPC2", "map_key": "dungeon1"})
    resp = admin_client.get("/api/npcs")
    assert len(resp.get_json()) == 2


def test_list_npcs_filter_map(admin_client):
    admin_client.post("/api/npcs", json={"name": "CityNPC", "map_key": "city2"})
    admin_client.post("/api/npcs", json={"name": "DungNPC", "map_key": "dungeon1"})
    resp = admin_client.get("/api/npcs?map_key=city2")
    data = resp.get_json()
    assert all(n["map_key"] == "city2" for n in data)


def test_get_npc_dialog(admin_client):
    nid = admin_client.post("/api/npcs", json={
        "name": "Talker", "dialog": "Welcome!",
    }).get_json()["npc"]["id"]
    resp = admin_client.get(f"/api/npcs/{nid}/dialog")
    assert resp.status_code == 200
    assert resp.get_json()["dialog"] == "Welcome!"


def test_update_npc(admin_client):
    nid = admin_client.post("/api/npcs", json={
        "name": "Old", "dialog": "Hi",
    }).get_json()["npc"]["id"]
    resp = admin_client.put(f"/api/npcs/{nid}", json={"name": "New", "npc_type": "shop"})
    assert resp.status_code == 200
    assert resp.get_json()["npc"]["name"] == "New"
    assert resp.get_json()["npc"]["npc_type"] == "shop"


def test_delete_npc(admin_client):
    nid = admin_client.post("/api/npcs", json={"name": "Del"}).get_json()["npc"]["id"]
    resp = admin_client.delete(f"/api/npcs/{nid}")
    assert resp.status_code == 200
    resp = admin_client.get(f"/api/npcs/{nid}")
    assert resp.status_code == 404


def test_create_npc_requires_admin(client):
    """미인증 요청은 401 반환"""
    resp = client.post("/api/npcs", json={"name": "Hack", "map_key": "city2"})
    assert resp.status_code == 401
