def test_create_item(client):
    resp = client.post("/api/items", json={
        "name": "Iron Sword", "category": "weapon",
        "attack_power": 10, "buy_price": 50,
    })
    assert resp.status_code == 201
    assert resp.get_json()["item"]["name"] == "Iron Sword"


def test_list_items(client):
    client.post("/api/items", json={"name": "Sword", "category": "weapon"})
    client.post("/api/items", json={"name": "Potion", "category": "potion"})
    resp = client.get("/api/items")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2


def test_list_items_filter_category(client):
    client.post("/api/items", json={"name": "Sword2", "category": "weapon"})
    client.post("/api/items", json={"name": "Potion2", "category": "potion"})
    resp = client.get("/api/items?category=weapon")
    data = resp.get_json()
    assert all(i["category"] == "weapon" for i in data)


def test_get_item(client):
    iid = client.post("/api/items", json={
        "name": "GetItem", "category": "drop",
    }).get_json()["item"]["id"]
    resp = client.get(f"/api/items/{iid}")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "GetItem"


def test_update_item(client):
    iid = client.post("/api/items", json={
        "name": "OldName", "category": "drop",
    }).get_json()["item"]["id"]
    resp = client.put(f"/api/items/{iid}", json={"name": "NewName"})
    assert resp.status_code == 200
    assert resp.get_json()["item"]["name"] == "NewName"


def test_delete_item(client):
    iid = client.post("/api/items", json={
        "name": "DelItem", "category": "drop",
    }).get_json()["item"]["id"]
    resp = client.delete(f"/api/items/{iid}")
    assert resp.status_code == 200
    resp = client.get(f"/api/items/{iid}")
    assert resp.status_code == 404
