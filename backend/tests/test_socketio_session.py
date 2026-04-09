"""Socket.IO 핸들러 DB 세션 누수 회귀 테스트.

레이어 A: with_db_session 데코레이터 단위 테스트
레이어 B: 실제 Socket.IO 이벤트 emit + session.remove spy
"""
import sys
import pytest
from unittest.mock import patch, MagicMock


class FakeRedisPipeline:
    def __init__(self, redis_client):
        self.redis_client = redis_client
        self.ops = []

    def hget(self, key, field):
        self.ops.append(("hget", key, field))
        return self.redis_client.hget(key, field)

    def hset(self, key, field, value):
        self.ops.append(("hset", key, field, value))
        return self

    def hdel(self, key, field):
        self.ops.append(("hdel", key, field))
        return self

    def execute(self):
        for op in self.ops:
            action = op[0]
            if action == "hset":
                _, key, field, value = op
                self.redis_client.hset(key, field, value)
            elif action == "hdel":
                _, key, field = op
                self.redis_client.hdel(key, field)
        self.ops.clear()
        return []


class FakeRedis:
    def __init__(self):
        self.hashes = {}

    def hget(self, key, field):
        return self.hashes.get(key, {}).get(str(field))

    def hset(self, key, field, value):
        self.hashes.setdefault(key, {})[str(field)] = value
        return 1

    def hdel(self, key, field):
        bucket = self.hashes.get(key, {})
        return 1 if bucket.pop(str(field), None) is not None else 0

    def hgetall(self, key):
        return dict(self.hashes.get(key, {}))

    def pipeline(self):
        return FakeRedisPipeline(self)

    def publish(self, channel, message):
        return 1

    def pubsub(self, **kwargs):
        return MagicMock()


# ═══════════════════════════════════════════════════════
# 레이어 A: with_db_session 데코레이터 단위 테스트
# ═══════════════════════════════════════════════════════

def test_normal_return_calls_remove():
    """정상 반환 시 db.session.remove() 호출"""
    with patch('utils.session.db.session') as mock_session:
        from utils.session import with_db_session

        @with_db_session
        def handler():
            return "ok"

        result = handler()
        assert result == "ok"
        mock_session.remove.assert_called_once()


def test_early_return_calls_remove():
    """조기 반환 시에도 db.session.remove() 호출"""
    with patch('utils.session.db.session') as mock_session:
        from utils.session import with_db_session

        @with_db_session
        def handler():
            if True:
                return None  # 조기 반환
            return "unreachable"

        handler()
        mock_session.remove.assert_called_once()


def test_exception_calls_rollback_and_remove():
    """예외 발생 시 rollback() + remove() 모두 호출"""
    with patch('utils.session.db.session') as mock_session:
        from utils.session import with_db_session

        @with_db_session
        def handler():
            raise ValueError("test error")

        with pytest.raises(ValueError):
            handler()
        mock_session.rollback.assert_called_once()
        mock_session.remove.assert_called_once()


# ═══════════════════════════════════════════════════════
# 레이어 B: 실제 Socket.IO 이벤트 + session spy
# ═══════════════════════════════════════════════════════

@pytest.fixture()
def socketio_app():
    """create_app()으로 실제 앱+socketio를 생성하되 외부 의존성은 차단"""
    # app 모듈이 이전 테스트에서 캐시됐을 수 있으므로 제거
    for mod_name in list(sys.modules):
        if mod_name == 'app' or mod_name.startswith('app.'):
            del sys.modules[mod_name]

    mock_redis_inst = FakeRedis()

    with patch('redis.ConnectionPool.from_url', return_value=MagicMock()), \
         patch('redis.Redis', return_value=mock_redis_inst), \
         patch('config.Config.SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:'), \
         patch('config.Config.SECRET_KEY', 'test-secret'), \
         patch('config.Config.SQLALCHEMY_ENGINE_OPTIONS', {}), \
         patch('flask_socketio.SocketIO.start_background_task',
               lambda self, target, *a, **kw: None):

        from app import create_app
        app, sio = create_app()

    app.config['TESTING'] = True
    app.fake_redis = mock_redis_inst
    from models import db
    with app.app_context():
        db.create_all()
        yield app, sio
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def sio_client(socketio_app):
    """socketio.test_client 생성 + sid 검증 자동 통과 설정"""
    app, sio = socketio_app
    client = app.test_client()
    sc = sio.test_client(app, flask_test_client=client)
    # fail-closed sid 검증 지원: 핸들러 내에서 request.sid 반환
    from flask import request as flask_req
    with patch('app.get_sid_by_char',
               side_effect=lambda cid: getattr(flask_req, 'sid', None)):
        yield sc, app


@pytest.fixture()
def raw_sio_client(socketio_app):
    """실제 Redis sid 바인딩 흐름을 검증하는 socketio.test_client."""
    app, sio = socketio_app
    client = app.test_client()
    sc = sio.test_client(app, flask_test_client=client)
    yield sc, app


def _make_user_and_char(name='tester', map_key='city'):
    """테스트용 User → Character 생성 (FK 준수)"""
    from models import db, User, Character
    user = User(username=f'u_{name}')
    db.session.add(user)
    db.session.flush()  # user.id 확보
    char = Character(name=name, map_key=map_key, x=0, y=0,
                     hp=100, max_hp=100, user_id=user.id)
    db.session.add(char)
    db.session.commit()
    return char


def _make_monster(map_key='city', x=0, y=0, hp=20):
    """테스트용 몬스터 생성."""
    from models import db, Monster
    mob = Monster(
        name=f"Mob_{map_key}_{x}_{y}",
        species="Slime",
        map_key=map_key,
        x=x,
        y=y,
        hp=hp,
        max_hp=hp,
        attack=5,
        defense=0,
        spawn_x=x,
        spawn_y=y,
        is_alive=True,
    )
    db.session.add(mob)
    db.session.commit()
    return mob


def test_chat_message_calls_remove(sio_client):
    """chat_message: emit 후 db.session.remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('chat_message', {'sender_id': None, 'text': 'hi'})
            spy.assert_called()


def test_join_map_char_not_found_calls_remove(sio_client):
    """join_map: 존재하지 않는 char_id → 조기 반환해도 remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('join_map', {'character_id': 9999, 'map_key': 'city'})
            spy.assert_called()


def test_join_map_normal_calls_remove(sio_client):
    """join_map: 정상 경로(char 존재)에서도 remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('joiner')
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('join_map', {'character_id': char.id, 'map_key': 'city'})
            spy.assert_called()


def test_join_map_binds_sid_and_allows_move(raw_sio_client):
    """join_map이 Redis sid를 바인딩하면 후속 move가 실제 검증을 통과한다."""
    sc, app = raw_sio_client
    import app as app_mod
    from models import db
    with app.app_context():
        char = _make_user_and_char('bound_joiner')

        sc.emit('join_map', {'character_id': char.id, 'map_key': 'city'})

        bound_sid = app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id)
        assert bound_sid
        assert app.fake_redis.hget(app_mod.K_SID_TO_MAP, bound_sid) == 'city'

        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 32, 'y': 32})
            spy_get.assert_called()


def test_request_monsters_calls_remove(sio_client):
    """request_monsters: 조회 후 remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('request_monsters', {'map_key': 'city'})
            spy.assert_called()


def test_move_char_not_found_calls_remove(sio_client):
    """move: char 없음 조기 반환 경로에서 remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('move', {'character_id': 9999, 'map_key': 'city',
                             'x': 10, 'y': 10})
            spy.assert_called()


def test_move_no_monster_calls_remove(sio_client):
    """move: 좌표 있으나 몬스터 없는 경로에서 remove() 호출"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('mover')
        with patch.object(db.session, 'remove', wraps=db.session.remove) as spy:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 32, 'y': 32})
            spy.assert_called()


# ═══════════════════════════════════════════════════════
# 레이어 C: 타일 기반 DB 스킵 최적화 테스트
# ═══════════════════════════════════════════════════════

def test_move_same_tile_skips_db_queries(sio_client):
    """같은 타일 내 연속 이동 → 두 번째는 DB 접근 없이 처리"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('fast_mover', map_key='city')
        # 첫 이동: cache miss → DB 접근 (_last_tile 세팅)
        sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                         'x': 32, 'y': 32})
        # 같은 타일(0,0) 내 두 번째 이동 → DB 스킵
        with patch.object(db.session, 'get') as mock_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 48, 'y': 48})
            mock_get.assert_not_called()


def test_move_same_tile_with_monster_hits_db_and_combat(sio_client):
    """같은 타일이어도 몬스터가 점유 중이면 DB/전투 경로를 다시 탄다."""
    sc, app = sio_client
    import app as app_mod
    from models import db, Monster
    with app.app_context():
        char = _make_user_and_char('fighter', map_key='city')
        sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                         'x': 32, 'y': 32})
        mob = _make_monster(map_key='city', x=0, y=0, hp=20)
        mob_id = mob.id
        app_mod._monster_tiles_by_map['city'] = {(0, 0)}

        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 48, 'y': 48})
            spy_get.assert_called()

        refreshed = db.session.get(Monster, mob_id)
        assert refreshed.hp < 20


def test_move_same_tile_no_monster_skips_db_even_on_combat_map(sio_client):
    """맵에 몬스터가 있어도, 해당 타일에 없으면 fast-path(DB 스킵) 정상 적용."""
    sc, app = sio_client
    import app as app_mod
    from models import db
    with app.app_context():
        char = _make_user_and_char('careful_mover', map_key='city')
        _make_monster(map_key='city', x=4, y=4, hp=20)
        app_mod._monster_tiles_by_map['city'] = {(4, 4)}

        # 첫 이동: cache miss → DB 경로 (tile 0,0 — 몬스터 없음)
        sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                         'x': 32, 'y': 32})
        # 같은 타일 두 번째 이동 → 타일에 몬스터 없으므로 fast-path
        with patch.object(db.session, 'get') as mock_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 48, 'y': 48})
            mock_get.assert_not_called()  # fast-path: DB 접근 없음


def test_move_tile_change_hits_db(sio_client):
    """다른 타일로 이동 시 DB 접근 확인"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('tile_changer', map_key='city')
        # 첫 이동: (32,32) → tile (0,0)
        sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                         'x': 32, 'y': 32})
        # 두 번째 이동: (200,200) → tile (1,1) — 다른 타일 → DB 접근
        with patch.object(db.session, 'get', return_value=char) as mock_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 200, 'y': 200})
            mock_get.assert_called()


def test_dead_char_same_tile_hits_db(sio_client):
    """죽은 캐릭터: _last_tile 무효화 후 같은 타일 이동 → DB 검증 + 브로드캐스트 차단"""
    sc, flask_app = sio_client
    import app as app_mod
    from models import db, Character
    with flask_app.app_context():
        char = _make_user_and_char('dead_char', map_key='city')
        char_id = char.id
        # 첫 이동: cache 세팅
        sc.emit('move', {'character_id': char_id, 'map_key': 'city',
                         'x': 32, 'y': 32})
        assert char_id in app_mod._last_tile  # cache 세팅 확인
        # 캐릭터 사망 + _last_tile 무효화
        char_obj = db.session.get(Character, char_id)
        char_obj.hp = 0
        db.session.commit()
        app_mod._last_tile.pop(char_id, None)
        # 같은 타일로 이동 → cache miss → DB 검증 경로
        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char_id, 'map_key': 'city',
                             'x': 48, 'y': 48})
            spy_get.assert_called()  # DB 경로를 탔음
        # inner가 False 반환 → _last_tile 미갱신 (브로드캐스트 차단 보장)
        assert char_id not in app_mod._last_tile


# ═══════════════════════════════════════════════════════
# 레이어 D: Redis sid 검증 테스트
# ═══════════════════════════════════════════════════════

def test_move_spoofed_sid_rejected(sio_client):
    """위조된 sid로 move 전송 시 DB 접근 없이 차단"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('victim', map_key='city')
        with patch('app.get_sid_by_char', return_value='fake_sid_12345'):
            with patch.object(db.session, 'get') as mock_get:
                sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                                 'x': 32, 'y': 32})
                mock_get.assert_not_called()  # DB 접근 없이 차단


def test_move_missing_char_sid_mapping_self_heals(raw_sio_client):
    """char_to_sid 누락 + 현재 sid가 같은 맵에 있으면 move에서 재바인딩 복구."""
    sc, app = raw_sio_client
    import app as app_mod
    from models import db
    with app.app_context():
        char = _make_user_and_char('missing_sid_map', map_key='city')
        sc.emit('join_map', {'character_id': char.id, 'map_key': 'city'})

        bound_sid = app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id)
        assert bound_sid is not None
        app.fake_redis.hdel(app_mod.K_CHAR_TO_SID, char.id)

        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 32, 'y': 32})
            spy_get.assert_called()

        assert app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id) == bound_sid


def test_move_stale_sid_mapping_self_heals(raw_sio_client):
    """stale old sid만 남고 현재 sid가 같은 맵에 있으면 move에서 현재 sid로 복구."""
    sc, app = raw_sio_client
    import app as app_mod
    from models import db
    with app.app_context():
        char = _make_user_and_char('stale_sid_map', map_key='city')
        sc.emit('join_map', {'character_id': char.id, 'map_key': 'city'})

        current_sid = app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id)
        assert current_sid is not None
        app.fake_redis.hset(app_mod.K_CHAR_TO_SID, char.id, 'stale_sid_123')
        app.fake_redis.hdel(app_mod.K_SID_TO_MAP, 'stale_sid_123')
        app.fake_redis.hset(app_mod.K_SID_TO_MAP, current_sid, 'city')

        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 32, 'y': 32})
            spy_get.assert_called()

        assert app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id) == current_sid


def test_move_byte_encoded_sid_mapping_is_accepted(raw_sio_client):
    """Redis가 bytes를 반환해도 sid/map 비교는 문자열 기준으로 통과해야 한다."""
    sc, app = raw_sio_client
    import app as app_mod
    from models import db
    with app.app_context():
        char = _make_user_and_char('byte_sid_map', map_key='city')
        sc.emit('join_map', {'character_id': char.id, 'map_key': 'city'})

        current_sid = app.fake_redis.hget(app_mod.K_CHAR_TO_SID, char.id)
        assert current_sid is not None
        app.fake_redis.hashes[app_mod.K_CHAR_TO_SID][str(char.id)] = current_sid.encode('utf-8')
        app.fake_redis.hashes[app_mod.K_SID_TO_MAP][str(current_sid)] = b'city'

        with patch.object(db.session, 'get', wraps=db.session.get) as spy_get:
            sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                             'x': 32, 'y': 32})
            spy_get.assert_called()


def test_move_no_redis_mapping_rejected(sio_client):
    """Redis에 sid 매핑 없는 캐릭터의 move 이벤트 차단"""
    sc, app = sio_client
    from models import db
    with app.app_context():
        char = _make_user_and_char('unregistered', map_key='city')
        with patch('app.get_sid_by_char', return_value=None):
            with patch.object(db.session, 'get') as mock_get:
                sc.emit('move', {'character_id': char.id, 'map_key': 'city',
                                 'x': 32, 'y': 32})
                mock_get.assert_not_called()  # DB 접근 없이 차단
