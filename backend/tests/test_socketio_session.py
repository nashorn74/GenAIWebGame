"""Socket.IO 핸들러 DB 세션 누수 회귀 테스트.

레이어 A: with_db_session 데코레이터 단위 테스트
레이어 B: 실제 Socket.IO 이벤트 emit + session.remove spy
"""
import sys
import pytest
from unittest.mock import patch, MagicMock


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

    mock_redis_inst = MagicMock()
    mock_redis_inst.hget.return_value = None      # 빈 Redis 시뮬레이션
    mock_redis_inst.hgetall.return_value = {}

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
    from models import db
    with app.app_context():
        db.create_all()
        yield app, sio
        db.drop_all()


@pytest.fixture()
def sio_client(socketio_app):
    """socketio.test_client 생성"""
    app, sio = socketio_app
    client = app.test_client()
    sc = sio.test_client(app, flask_test_client=client)
    return sc, app


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
    """죽은 캐릭터: _last_tile 무효화 후 같은 타일 이동 → DB 검증 경로"""
    sc, flask_app = sio_client
    import app as app_mod
    from models import db, Character
    with flask_app.app_context():
        char = _make_user_and_char('dead_char', map_key='city')
        char_id = char.id
        # 첫 이동: cache 세팅
        sc.emit('move', {'character_id': char_id, 'map_key': 'city',
                         'x': 32, 'y': 32})
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
