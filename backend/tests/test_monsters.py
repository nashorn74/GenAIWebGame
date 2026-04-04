from models import db, Monster


def _seed_monsters(session):
    m1 = Monster(name="Slime #1", species="Slime", map_key="dungeon1", level=1)
    m2 = Monster(name="Wolf #1", species="SnowWolf", map_key="dungeon1", level=3)
    m3 = Monster(name="Slime #2", species="Slime", map_key="worldmap", level=2)
    session.add_all([m1, m2, m3])
    session.commit()
    return [m1, m2, m3]


def test_list_monsters_empty(client):
    resp = client.get("/api/monsters")
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_list_monsters(client, session):
    _seed_monsters(session)
    resp = client.get("/api/monsters")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 3


def test_list_monsters_filter_by_map_key(client, session):
    _seed_monsters(session)
    resp = client.get("/api/monsters?map_key=dungeon1")
    data = resp.get_json()
    assert len(data) == 2
    assert all(m["map_key"] == "dungeon1" for m in data)


def test_list_monsters_filter_no_match(client, session):
    _seed_monsters(session)
    resp = client.get("/api/monsters?map_key=nonexistent")
    assert resp.status_code == 200
    assert resp.get_json() == []
