from models import db, Character, User, Item, CharacterItem


def _setup_user_and_char(client, username="itemuser", char_name="ItemChar", hp=50, max_hp=120):
    """Helper: create user + character, return (user_id, char_id)."""
    reg = client.post("/auth/register", json={
        "username": username, "password": "abcd1234", "password_confirm": "abcd1234",
    })
    assert reg.status_code == 201
    login = client.post("/auth/login", json={
        "username": username, "password": "abcd1234",
    })
    uid = login.get_json()["user"]["id"]
    cr = client.post("/api/characters", json={
        "user_id": uid, "name": char_name, "job": "warrior",
    })
    cid = cr.get_json()["character"]["id"]
    return uid, cid


def _create_potion(app, effect_value=30):
    """Helper: create a potion item in DB, return item_id."""
    with app.app_context():
        item = Item(name=f"Potion{effect_value}", category="potion",
                    effect_value=effect_value, buy_price=10)
        db.session.add(item)
        db.session.commit()
        return item.id


def _give_item(app, char_id, item_id, qty=5):
    """Helper: add item to character inventory."""
    with app.app_context():
        ci = CharacterItem(character_id=char_id, item_id=item_id, quantity=qty)
        db.session.add(ci)
        db.session.commit()


def _set_hp(app, char_id, hp):
    """Helper: set character HP."""
    with app.app_context():
        char = db.session.get(Character, char_id)
        char.hp = hp
        db.session.commit()


def test_create_item(admin_client):
    resp = admin_client.post("/api/items", json={
        "name": "Iron Sword", "category": "weapon",
        "attack_power": 10, "buy_price": 50,
    })
    assert resp.status_code == 201
    assert resp.get_json()["item"]["name"] == "Iron Sword"


def test_list_items(admin_client):
    admin_client.post("/api/items", json={"name": "Sword", "category": "weapon"})
    admin_client.post("/api/items", json={"name": "Potion", "category": "potion"})
    resp = admin_client.get("/api/items")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2


def test_list_items_filter_category(admin_client):
    admin_client.post("/api/items", json={"name": "Sword2", "category": "weapon"})
    admin_client.post("/api/items", json={"name": "Potion2", "category": "potion"})
    resp = admin_client.get("/api/items?category=weapon")
    data = resp.get_json()
    assert all(i["category"] == "weapon" for i in data)


def test_get_item(admin_client):
    iid = admin_client.post("/api/items", json={
        "name": "GetItem", "category": "drop",
    }).get_json()["item"]["id"]
    resp = admin_client.get(f"/api/items/{iid}")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "GetItem"


def test_update_item(admin_client):
    iid = admin_client.post("/api/items", json={
        "name": "OldName", "category": "drop",
    }).get_json()["item"]["id"]
    resp = admin_client.put(f"/api/items/{iid}", json={"name": "NewName"})
    assert resp.status_code == 200
    assert resp.get_json()["item"]["name"] == "NewName"


def test_delete_item(admin_client):
    iid = admin_client.post("/api/items", json={
        "name": "DelItem", "category": "drop",
    }).get_json()["item"]["id"]
    resp = admin_client.delete(f"/api/items/{iid}")
    assert resp.status_code == 200
    resp = admin_client.get(f"/api/items/{iid}")
    assert resp.status_code == 404


def test_create_item_missing_name(admin_client):
    resp = admin_client.post("/api/items", json={"category": "drop"})
    assert resp.status_code == 400
    assert "name" in resp.get_json()["error"].lower()


def test_create_item_requires_admin(client):
    """미인증 요청은 401 반환"""
    resp = client.post("/api/items", json={"name": "Hack", "category": "weapon"})
    assert resp.status_code == 401


def test_update_item_requires_admin(client, admin_client):
    """미인증 수정 요청은 401 반환"""
    iid = admin_client.post("/api/items", json={
        "name": "UpdAuth", "category": "drop",
    }).get_json()["item"]["id"]
    resp = client.put(f"/api/items/{iid}", json={"name": "Hacked"})
    assert resp.status_code == 401


def test_delete_item_requires_admin(client, admin_client):
    """미인증 삭제 요청은 401 반환"""
    iid = admin_client.post("/api/items", json={
        "name": "DelAuth", "category": "drop",
    }).get_json()["item"]["id"]
    resp = client.delete(f"/api/items/{iid}")
    assert resp.status_code == 401


# ── use_item tests ──

def test_use_item_success(app, client):
    _, cid = _setup_user_and_char(client, "useitem1", "UseChar1")
    pid = _create_potion(app, effect_value=30)
    _give_item(app, cid, pid, qty=3)
    _set_hp(app, cid, 50)  # HP 50 / 120

    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": pid, "quantity": 1,
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["healed"] == 30
    assert data["hp"] == 80


def test_use_item_missing_params(client):
    resp = client.post("/api/items/use", json={"character_id": 1})
    assert resp.status_code == 400

    resp = client.post("/api/items/use", json={"item_id": 1})
    assert resp.status_code == 400


def test_use_item_invalid_character(app, client):
    pid = _create_potion(app)
    resp = client.post("/api/items/use", json={
        "character_id": 99999, "item_id": pid,
    })
    assert resp.status_code == 404


def test_use_item_invalid_item(app, client):
    _, cid = _setup_user_and_char(client, "useitem2", "UseChar2")
    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": 99999,
    })
    assert resp.status_code == 404


def test_use_item_not_potion(app, client):
    _, cid = _setup_user_and_char(client, "useitem3", "UseChar3")
    # Create a weapon (not potion)
    with app.app_context():
        weapon = Item(name="TestSword", category="weapon", attack_power=10)
        db.session.add(weapon)
        db.session.commit()
        wid = weapon.id
    _give_item(app, cid, wid, qty=1)
    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": wid,
    })
    assert resp.status_code == 400
    assert "소비" in resp.get_json()["error"]


def test_use_item_insufficient_qty(app, client):
    _, cid = _setup_user_and_char(client, "useitem4", "UseChar4")
    pid = _create_potion(app, effect_value=20)
    _give_item(app, cid, pid, qty=1)
    _set_hp(app, cid, 50)

    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": pid, "quantity": 5,
    })
    assert resp.status_code == 400
    assert "부족" in resp.get_json()["error"]


def test_use_item_already_max_hp(app, client):
    _, cid = _setup_user_and_char(client, "useitem5", "UseChar5")
    pid = _create_potion(app, effect_value=30)
    _give_item(app, cid, pid, qty=2)
    # HP is already at max (120/120 for warrior)

    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": pid,
    })
    assert resp.status_code == 400
    assert "최대" in resp.get_json()["error"]


def test_use_item_consume_all(app, client):
    _, cid = _setup_user_and_char(client, "useitem6", "UseChar6")
    pid = _create_potion(app, effect_value=200)
    _give_item(app, cid, pid, qty=1)
    _set_hp(app, cid, 10)

    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": pid, "quantity": 1,
    })
    assert resp.status_code == 200
    assert resp.get_json()["remaining_qty"] == 0


def test_use_item_qty_less_than_one(app, client):
    _, cid = _setup_user_and_char(client, "useitem7", "UseChar7")
    pid = _create_potion(app)
    resp = client.post("/api/items/use", json={
        "character_id": cid, "item_id": pid, "quantity": 0,
    })
    assert resp.status_code == 400
