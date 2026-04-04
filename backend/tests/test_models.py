from models import db, User, Character, Item, CharacterItem


class TestUser:
    def test_create_and_to_dict(self, session):
        u = User(username="tester", email="t@t.com")
        session.add(u)
        session.commit()
        d = u.to_dict()
        assert d["username"] == "tester"
        assert d["email"] == "t@t.com"
        assert d["status"] == "active"

    def test_password_hash(self, session):
        u = User(username="pw_test")
        u.set_password("secret123")
        session.add(u)
        session.commit()
        assert u.check_password("secret123") is True
        assert u.check_password("wrong") is False


class TestCharacter:
    def _make_user(self, session):
        u = User(username="charuser")
        session.add(u)
        session.commit()
        return u

    def test_create_defaults(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Hero")
        session.add(c)
        session.commit()
        assert c.level == 1
        assert c.hp == 100
        assert c.gold == 100

    def test_gain_exp_level_up(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Exp")
        session.add(c)
        session.commit()
        # level 1 -> needs 100 exp
        c.gain_exp(100)
        assert c.level == 2
        assert c.exp == 0
        assert c.max_hp == 110  # +10
        assert c.max_mp == 55   # +5
        assert c.hp == c.max_hp  # full heal on level up

    def test_gain_exp_no_negative(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Neg")
        session.add(c)
        session.commit()
        c.gain_exp(-50)
        assert c.exp == 0

    def test_exp_to_next_level(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Lvl")
        session.add(c)
        session.commit()
        assert c.exp_to_next_level() == 100  # level 1 * 100
        c.gain_exp(100)
        assert c.exp_to_next_level() == 200  # level 2 * 100

    def test_multi_level_up(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Multi")
        session.add(c)
        session.commit()
        # 100 + 200 = 300 -> level 3 with 0 remaining
        c.gain_exp(300)
        assert c.level == 3
        assert c.exp == 0

    def test_to_dict_includes_items(self, session):
        u = self._make_user(session)
        c = Character(user_id=u.id, name="Inv")
        item = Item(name="Potion", category="potion")
        session.add_all([c, item])
        session.commit()
        ci = CharacterItem(character_id=c.id, item_id=item.id, quantity=3)
        session.add(ci)
        session.commit()
        d = c.to_dict()
        assert len(d["items"]) == 1
        assert d["items"][0]["quantity"] == 3


class TestItem:
    def test_create_and_to_dict(self, session):
        i = Item(name="Sword", category="weapon", attack_power=10, buy_price=50)
        session.add(i)
        session.commit()
        d = i.to_dict()
        assert d["name"] == "Sword"
        assert d["attack_power"] == 10
        assert d["buy_price"] == 50
