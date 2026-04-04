from models import db, User, Character, Item, NPC, CharacterItem


def _setup_shop(session):
    """공통 테스트 데이터: 유저, 캐릭터, 상점 NPC, 아이템."""
    u = User(username="shopuser")
    session.add(u)
    session.flush()

    c = Character(user_id=u.id, name="Shopper", gold=500)
    session.add(c)

    npc = NPC(name="Merchant", npc_type="shop", is_active=True)
    session.add(npc)

    buy_item = Item(name="HP Potion", category="potion", buy_price=50, sell_price=0)
    sell_item = Item(name="Slime Jelly", category="drop", buy_price=0, sell_price=10)
    session.add_all([buy_item, sell_item])
    session.commit()

    return c, npc, buy_item, sell_item


def test_buy_success(client, session):
    c, npc, buy_item, _ = _setup_shop(session)
    resp = client.post(f"/api/shops/{npc.id}/buy", json={
        "character_id": c.id, "item_id": buy_item.id, "quantity": 2,
    })
    assert resp.status_code == 200
    assert resp.get_json()["character_gold"] == 400  # 500 - 50*2


def test_buy_not_enough_gold(client, session):
    c, npc, buy_item, _ = _setup_shop(session)
    resp = client.post(f"/api/shops/{npc.id}/buy", json={
        "character_id": c.id, "item_id": buy_item.id, "quantity": 100,
    })
    assert resp.status_code == 400
    assert "gold" in resp.get_json()["error"].lower()


def test_buy_not_purchasable(client, session):
    c, npc, _, sell_item = _setup_shop(session)
    resp = client.post(f"/api/shops/{npc.id}/buy", json={
        "character_id": c.id, "item_id": sell_item.id, "quantity": 1,
    })
    assert resp.status_code == 400
    assert "cannot be purchased" in resp.get_json()["error"]


def test_sell_success(client, session):
    c, npc, _, sell_item = _setup_shop(session)
    ci = CharacterItem(character_id=c.id, item_id=sell_item.id, quantity=5)
    session.add(ci)
    session.commit()

    resp = client.post(f"/api/shops/{npc.id}/sell", json={
        "character_id": c.id, "item_id": sell_item.id, "quantity": 3,
    })
    assert resp.status_code == 200
    assert resp.get_json()["character_gold"] == 530  # 500 + 10*3


def test_sell_not_enough_items(client, session):
    c, npc, _, sell_item = _setup_shop(session)
    ci = CharacterItem(character_id=c.id, item_id=sell_item.id, quantity=1)
    session.add(ci)
    session.commit()

    resp = client.post(f"/api/shops/{npc.id}/sell", json={
        "character_id": c.id, "item_id": sell_item.id, "quantity": 5,
    })
    assert resp.status_code == 400
    assert "Not enough" in resp.get_json()["error"]


def test_sell_removes_empty_stack(client, session):
    c, npc, _, sell_item = _setup_shop(session)
    ci = CharacterItem(character_id=c.id, item_id=sell_item.id, quantity=2)
    session.add(ci)
    session.commit()

    client.post(f"/api/shops/{npc.id}/sell", json={
        "character_id": c.id, "item_id": sell_item.id, "quantity": 2,
    })
    remaining = CharacterItem.query.filter_by(
        character_id=c.id, item_id=sell_item.id
    ).first()
    assert remaining is None


def test_buy_from_non_shop_npc(client, session):
    u = User(username="nonshop1")
    session.add(u)
    session.flush()
    c = Character(user_id=u.id, name="NonShop", gold=100)
    npc = NPC(name="Normal", npc_type="normal", is_active=True)
    item = Item(name="Sword", category="weapon", buy_price=10)
    session.add_all([c, npc, item])
    session.commit()

    resp = client.post(f"/api/shops/{npc.id}/buy", json={
        "character_id": c.id, "item_id": item.id, "quantity": 1,
    })
    assert resp.status_code == 400
    assert "not a shop" in resp.get_json()["error"].lower()
