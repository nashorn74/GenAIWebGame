from flask import Flask
from flask import request          # ← 추가
from uuid import uuid4
from flask_cors import CORS
from config import Config
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Character, NPC, Item, Map, Monster, CharacterItem
from routes import bp as api_bp
from auth import auth_bp
from auth_admin import admin_auth_bp
from characters import characters_bp
from npcs import npcs_bp
from items import items_bp
from shop import shop_bp
from maps import maps_bp
from monsters import monsters_bp
from sqlalchemy.orm import Session   # 타입 힌트용
from sqlalchemy import select
from utils.walkable import get_walkable, get_tilemap
from random import choice, shuffle
from typing import Any
import os, redis
import time
import json

knockback_until: dict[int, float] = {}   # {monster_id: unix_timestamp}
last_move_sent: dict[int, float] = {}   # {char_id: unix_ts}

# ---------------------------------------------
# redis 연결
# ---------------------------------------------
import os, redis
import redis                     # ▸ pip install redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
os.environ["EVENTLET_NO_GREENDNS"] = "yes" 

import eventlet               # A: 반드시 먼저 import
eventlet.monkey_patch()       # A: 표준 라이브러리 패치

# eventlet 의 greendns 가 DNS 타임아웃을 일으키면 아래 옵션으로 우회 가능
#   (redis-py 5.x 이상)
pool = redis.ConnectionPool.from_url(
        REDIS_URL,
        socket_connect_timeout=2,   # 초
        socket_timeout=2,
)
r = redis.Redis(connection_pool=pool, decode_responses=True)

# ▸ 키 이름 한곳에 모아두면 나중에 prefix 바꾸기 쉬움
K_CHAR_TO_SID = "char_to_sid"    # HSET char_id -> sid
K_SID_TO_MAP  = "sid_to_map"     # HSET sid -> map_key

# ─── 편의 함수 ──────────────────────────
def get_sid_by_char(char_id: int) -> str | None:
    return r.hget(K_CHAR_TO_SID, char_id)

def get_map_by_sid(sid: str) -> str | None:
    return r.hget(K_SID_TO_MAP, sid)

def bind_char_sid(char_id: int, sid: str, map_key: str):
    """(1) 같은 char로 열린 기존 세션 정리 → (2) 새 sid 바인드"""
    pipe = r.pipeline()
    # ① 기존 sid 있으면 두 해시 모두에서 제거
    old_sid = r.hget(K_CHAR_TO_SID, char_id)
    if old_sid:
        pipe.hdel(K_SID_TO_MAP, old_sid)
    # ② 새 매핑
    pipe.hset(K_CHAR_TO_SID, char_id, sid)
    pipe.hset(K_SID_TO_MAP , sid    , map_key)
    pipe.execute()

def update_sid_map(sid: str, map_key: str):
    r.hset(K_SID_TO_MAP, sid, map_key)

def remove_sid(sid: str):
    """disconnect 때 호출: hash 2 곳 모두 clean + char_id 반환"""
    pipe = r.pipeline()
    char_id = None
    # sid -> map 해시에서 pop
    pipe.hget(K_SID_TO_MAP, sid)
    pipe.hdel(K_SID_TO_MAP, sid)
    # char_to_sid 해시에서 역-검색
    char_id = r.hgetall(K_CHAR_TO_SID)        # 작은 해시라 OK
    for cid, stored in char_id.items():
        if stored == sid:
            char_id = int(cid)
            pipe.hdel(K_CHAR_TO_SID, cid)
            break
    pipe.execute()
    return char_id
# ---------------------------------------------

from math import hypot
TILE   = 128                    # 이미 쓰던 상수
INVALID_TILE_ID = 15            # ❶ 금단 타일

ATK_RANGE  = 1                  # 타일 1칸이면 근접
AGGRO_DIST = 4                  # 몬스터가 플레이어 인식하는 반경(타일)

EXP_PER_LEVEL = 20              # 간단한 보상 공식
RESPAWN_POS   = ('city2', 1, 26)

tilemaps: dict[str, Any] = {}

def get_layer(map_key:str):
    if map_key not in tilemaps:
        _, layer = get_tilemap(map_key)   # layer.data → 2-D list
        tilemaps[map_key] = layer
    return tilemaps[map_key]              # SimpleNamespace

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio = SocketIO(app, 
                        cors_allowed_origins="*", 
                        async_mode='eventlet',     # A: thread → eventlet
    )

    CORS(app)

    @app.after_request
    def add_cache_headers(response):
        """API GET 응답에 Cache-Control 헤더를 추가하여 브라우저 캐시 방지"""
        if request.method == 'GET' and request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.teardown_appcontext
    def remove_session(exc=None):
        if exc:
            db.session.rollback()  # D: 예외 시 롤백
        db.session.remove()

    # ──────────────────────────────────────────────────────────
    # Redis Pub/Sub 구독용 백그라운드 루프
    # ──────────────────────────────────────────────────────────
    def chat_listener():
        pubsub = r.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe("global_chat")
        while True:
            msg = pubsub.get_message(timeout=1.0)
            if msg and msg['type'] == 'message':
                print("recieved message -------------")
                print(msg['data'])
                print("------------------------------")
                data = json.loads(msg['data'])
                socketio.emit("chat_message", data)

            socketio.sleep(0.01)
    
    # 백그라운드로 시작
    socketio.start_background_task(chat_listener)

    # ──────────────────────────────────────────────────────────
    # 클라이언트로부터 채팅 메시지 수신 핸들러
    # ──────────────────────────────────────────────────────────
    @socketio.on("chat_message")
    def handle_chat_message(data):
        """
        data = {
          "sender_id": <int>,
          "text":      <string>
        }
        """
        # 보낸 사람 이름 조회
        sender_id = data.get("sender_id")
        char = db.session.get(Character, sender_id) if sender_id else None
        sender_name = char.name if char else "Unknown"
        msg = {
            "sender"   : sender_name,
            "text"     : data.get("text", ""),
            "ts"       : int(time.time())
        }
        print("publish message =============")
        print(msg)
        print("=============================")
        # Redis 채널로 발행 (모든 프로세스가 SUBSCRIBE하고 있음)
        r.publish("global_chat", json.dumps(msg))
        # (선택) 보낸 사람에게 확인 응답
        emit("chat_ack", {"ok": True})

    # ─────────────────────────────────────────────
    #  🐾  몬스터 랜덤 이동 루프 (2초 간격)
    # ─────────────────────────────────────────────
    def monster_ai():
        walkable = get_walkable("dungeon1")        # 캐시
        while True:
            socketio.sleep(2.0)
            try:
                with app.app_context():
                    # 모든 캐릭터 위치 미리 캐시(딕셔너리)
                    chars = {c.id: c for c in Character.query.all()}

                    now  = time.time()

                    # ── 0) 먼저 “죽은 몬스터 중 리스폰할 대상” 검사 ──
                    dead_ready = (
                        Monster.query.filter_by(is_alive=False, map_key='dungeon1')
                        .filter(Monster.died_at.isnot(None))          # safety
                        .all()
                    )
                    respawned = False
                    for m in dead_ready:
                        if now - m.died_at >= m.respawn_s:
                            m.is_alive = True
                            m.hp       = m.max_hp
                            m.x, m.y   = m.spawn_x, m.spawn_y
                            m.died_at  = None
                            respawned = True
                            socketio.emit('monster_spawn', m.to_dict(), room='map_dungeon1')

                    # 리스폰 변경분을 즉시 커밋 — 이후 이동/전투 롤백에 영향받지 않도록
                    if respawned:
                        db.session.commit()

                    # ── 1) 살아있는 몬스터 랜덤 이동 (기존 로직) ──

                    mobs = Monster.query.filter_by(
                        map_key="dungeon1", is_alive=True
                    ).all()

                    # ── ① 현재 점유 타일 set ──
                    occupied: set[tuple[int, int]] = {(m.x, m.y) for m in mobs}

                    shuffle(mobs)                       # 이동 순서 랜덤화
                    for m in mobs:
                        # ── ❌ 아직 넉백 쿨타임이면 건너뜀 ──
                        if knockback_until.get(m.id, 0) > now:
                            continue

                        # ── 타깃 선정 ─────────────────────
                        target = chars.get(m.target_char_id) if m.target_char_id else None
                        if (not target) or target.map_key != m.map_key or target.hp <= 0:
                            # 새로 찾아본다
                            target = None
                            for c in chars.values():
                                # 좌표가 없으면 무시
                                if c.x is None or c.y is None:
                                    app.logger.warning("null coord in chars: id=%s", c.id)
                                    continue
                                if c.map_key != m.map_key or c.hp <= 0:
                                    continue
                                if hypot(c.x/TILE - m.x, c.y/TILE - m.y) <= AGGRO_DIST:
                                    target = c
                                    break
                            m.target_char_id = target.id if target else None

                        if target and target.hp <= 0:     # 이미 죽었다면
                            m.target_char_id = None            # ← 타깃 해제
                            continue

                        # ── 이동 (타깃이 없으면 랜덤) ────
                        if target:
                            # 한 칸 이동을 위해 x/y 차이 정규화
                            dx = 1 if target.x/TILE > m.x else -1 if target.x/TILE < m.x else 0
                            dy = 1 if target.y/TILE > m.y else -1 if target.y/TILE < m.y else 0
                            cand = [
                                (m.x+dx, m.y) if dx else None,
                                (m.x, m.y+dy) if dy else None
                            ]
                            cand = [p for p in cand if p and p in walkable and p not in occupied]
                            if cand:
                                nx, ny = cand[0]         # 우선순위 하나만
                            else:
                                nx, ny = m.x, m.y        # 못 움직임
                        else:
                            # 기존 랜덤 이동
                            # ── ② 네 방향 후보 중 walkable ∩ not-occupied ──
                            cand = [
                                (m.x + 1, m.y),
                                (m.x - 1, m.y),
                                (m.x, m.y + 1),
                                (m.x, m.y - 1),
                            ]
                            cand = [p for p in cand if p in walkable and p not in occupied]

                            if not cand:                 # 사면이 막혀 있으면
                                nx, ny = m.x, m.y        # 그냥 가만히 두기
                            else:
                                nx, ny = choice(cand)
                        
                        if (nx, ny) != (m.x, m.y):
                            occupied.discard((m.x, m.y))
                            occupied.add((nx, ny))
                            m.x, m.y = nx, ny
                            socketio.emit('monster_move',
                                        {"id": m.id, "x": nx, "y": ny},
                                        room="map_dungeon1")

                        # ── 공격 판정 ───────────────────
                        if target and hypot(target.x/TILE - m.x, target.y/TILE - m.y) <= ATK_RANGE:
                            dmg = max(1, m.attack - target.dex)   # 방어 대신 DEX 사용 예시
                            with db.session.no_autoflush:
                                target.hp -= dmg

                            # --- NEW:  0 보다 작으면 0 으로 보정 + 죽음 판정 ---
                            if target.hp <= 0:
                                target.hp = 0
                                dead = True
                            else:
                                dead = False
                            # ----------------------------------------------------

                            # 데미지 브로드캐스트
                            socketio.emit('player_hit', {
                                "id": target.id, "dmg": dmg, "hp": target.hp
                            }, room=f"map_{target.map_key}")

                            # HP <=0  이면 사망 처리
                            if dead:
                                prev_map = target.map_key          # ① 기존 방 보관
                                # 드롭 아이템(카테고리 drop) 전부 삭제
                                with db.session.no_autoflush:          # ← ★ 중요
                                    for ci in list(target.items):
                                        if ci.item.category == 'drop':
                                            db.session.delete(ci)

                                # ② 리스폰 좌표/맵으로 이동
                                target.hp  = target.max_hp // 2
                                target.map_key, target.x, target.y = RESPAWN_POS
                                db.session.commit()
                                resp_pkt = {                           # ② 공통 패킷
                                    "id"     : target.id,
                                    "map_key": target.map_key,
                                    "x"      : target.x*TILE + TILE/2,
                                    "y"      : target.y*TILE + TILE/2,
                                    "hp"     : target.hp
                                }
                                print(resp_pkt)
                                socketio.emit('player_respawn', resp_pkt, room=f'map_{prev_map}')

                                target_sid = get_sid_by_char(target.id).decode();
                                print(target_sid)
                                if target_sid:
                                    # ① 이전 방 모든 플레이어에게 despawn (잔상 제거)
                                    socketio.emit(
                                        'player_despawn', {'id': target.id},
                                        room=f'map_{prev_map}', namespace='/'
                                    )
                                    # ② 해당 플레이어(본인)에게만 respawn
                                    socketio.emit(
                                        'player_respawn', resp_pkt,
                                        to=target_sid, namespace='/'
                                    )
                                    # ③ 새 방 플레이어들에게 spawn (본인 제외)
                                    socketio.emit(
                                        'player_spawn', resp_pkt,
                                        room=f'map_{target.map_key}', skip_sid=target_sid,
                                        namespace='/'
                                    )
                                else:
                                    # 오프라인 상태면 최소 despawn만
                                    socketio.emit(
                                        'player_despawn', {'id': target.id},
                                        room=f'map_{prev_map}', namespace='/'
                                    )

                        # ─── ❶ 금단 타일 체크 & 강제 리스폰 ───
                        layer = get_layer(m.map_key)          # SimpleNamespace
                        gid   = layer.data[m.y][m.x]          # ← int gid
                        if gid == INVALID_TILE_ID:            # 객체가 아니라 gid 비교
                            m.x, m.y = m.spawn_x, m.spawn_y
                            knockback_until.pop(m.id, None)   # (선택) 넉백 쿨타임 해제
                            socketio.emit('monster_move', {
                                'id': m.id, 'x': m.x, 'y': m.y
                            }, room=f'map_{m.map_key}')

                    db.session.commit()
            except Exception:
                with app.app_context():        # 롤백도 컨텍스트 안에서
                    db.session.rollback()
                raise
            finally:
                with app.app_context():
                    db.session.remove()

    def random_step(x: int, y: int, walkable: set[tuple[int,int]]):
        cand = [(x+1,y), (x-1,y), (x,y+1), (x,y-1)]
        cand = [p for p in cand if p in walkable]
        return choice(cand) if cand else (x, y)

    # Flask-SocketIO 의 헬퍼로 백그라운드 태스크 시작
    socketio.start_background_task(monster_ai)

    @socketio.on('connect')
    def on_connect():
        print('◆ socket connected', request.sid)      # ★ 반드시 떠야 함

    # ────────────────────────────────────────────────
    # ① 맵 입장
    @socketio.on('join_map')
    def handle_join_map(data):
        sid        = request.sid
        char_id    = data['character_id']
        req_map    = data.get('map_key')
        # 0) 로드 & DB 반영
        char:Character = db.session.get(Character, char_id)
        if not char:
            return
        if req_map and req_map != char.map_key:
            char.map_key = req_map
            db.session.commit()
        cur_map = char.map_key
        char_d  = char.to_dict()
        db.session.remove()

        # 1) 이전 방에서 despawn + leave
        prev_map = get_map_by_sid(sid)
        if prev_map and prev_map != cur_map:
            socketio.emit(
                'player_despawn', {'id': char_id},
                room=f'map_{prev_map}', namespace='/'
            )
            leave_room(f'map_{prev_map}')

        # 2) 새 방 join + Redis 갱신
        join_room(f'map_{cur_map}')
        bind_char_sid(char_id, sid, cur_map)

        # 3) 자기 자신에게 초기 상태 푸시
        players  = Character.query.filter_by(map_key=cur_map).all()
        monsters = Monster.query.filter_by(map_key=cur_map, is_alive=True).all()
        emit('current_players',  [p.to_dict() for p in players],  to=sid)
        emit('current_monsters', [m.to_dict() for m in monsters], to=sid)

        # 4) 새로 들어온 클라이언트에게 다른 플레이어들 spawn
        for p in players:
            if p.id != char_id:
                emit('player_spawn', p.to_dict(), to=sid)

        # 5) 나를 다른 클라이언트들에게 spawn
        socketio.emit(
            'player_spawn', char_d,
            room=f'map_{cur_map}', include_self=False, namespace='/'
        )

    # ── 몬스터 동기화 요청 (주기적 폴링 대응)
    @socketio.on('request_monsters')
    def handle_request_monsters(data):
        map_key = data.get('map_key')
        if not map_key:
            return
        monsters = Monster.query.filter_by(map_key=map_key, is_alive=True).all()
        emit('current_monsters', [m.to_dict() for m in monsters])

    # ② 이동
    @socketio.on('move')
    def handle_move(data):
        """
        • 플레이어 이동 브로드캐스트
        • 이동한 타일에 몬스터가 있으면 타격 → 데미지 / 넉백 / 드롭 처리
        """
        char_id   = data.get('character_id')
        new_map   = data.get('map_key')
        new_px    = data.get('x')
        new_py    = data.get('y')

        char: Character = db.session.get(Character, char_id)
        if not char or char.hp <= 0:          # ★ 추가
            db.session.rollback()
            return

        # ───────── NEW ─────────
        if new_px is None or new_py is None:
            # 잘못된 패킷 → 세션만 정리하고 조용히 무시
            db.session.rollback()
            return
        # ───────────────────────

        char: Character = db.session.get(Character, char_id)
        if not char:
            db.session.remove()
            return

        # ── 0. 이동 전·후 좌표 계산 ───────────────────────────────
        prev_px, prev_py = (char.x or new_px), (char.y or new_py)
        char.map_key, char.x, char.y = new_map, new_px, new_py
        db.session.commit()                              # 캐릭터 위치 확정

        # ── 0-1.  이동 패킷 rate-limit ─────────────────────────
        now = time.time()
        if now - last_move_sent.get(char_id, 0) >= 0.12:   # 120 ms
            emit('player_move', {'id': char_id,
                                'x': new_px, 'y': new_py},
                room=f"map_{new_map}", include_self=False)
            last_move_sent[char_id] = now
        # ----------------------------------------------------

        # 픽셀 → 타일 좌표
        tx,  ty  = int(new_px  // TILE), int(new_py  // TILE)
        ptx, pty = int(prev_px // TILE), int(prev_py // TILE)

        # ── 1. 해당 타일에 살아있는 몬스터 탐색 ──────────────────
        mob: Monster | None = (
            Monster.query
                .filter_by(map_key=new_map,
                            x=tx, y=ty,
                            is_alive=True)
                .first()
        )
        if not mob:                                        # 충돌 X
            db.session.rollback()
            return

        # ── 2. 데미지 계산 ──────────────────────────────────────
        atk  = max(1, char.str)                            # 아주 단순한 예시
        dmg  = max(1, atk - mob.defense)
        mob.hp -= dmg                       # ← 음수로 갈 수 있음

        # --- NEW: 체력 보정 + 죽음 판정 ---
        if mob.hp <= 0:
            mob.hp = 0
            mob_dead = True
        else:
            mob_dead = False
        # ---------------------------------

        # ── 3. 넉백 계산 ──────────────────────────────────────────
        dx = 1 if mob.x > tx else -1 if mob.x < tx else 0
        dy = 1 if mob.y > ty else -1 if mob.y < ty else 0

        if dx or dy:
            walkable = get_walkable(new_map)
            with db.session.no_autoflush:
                occupied = {(m.x, m.y) for m in Monster.query.filter_by(
                                map_key=new_map, is_alive=True)}

            last_free: tuple[int,int] | None = None
            # 1 → 2칸 ‘계단식’ 루프
            for step in (1, 2):
                nx = mob.x + dx*step
                ny = mob.y + dy*step
                # 벽이거나 다른 몬스터가 있으면 멈춤
                if (nx, ny) not in walkable or (nx, ny) in occupied:
                    break
                last_free = (nx, ny)            # 한 칸씩 전진하며 기록

            if last_free:                       # 최소 1칸은 비어 있었음
                mob.x, mob.y = last_free
                knockback_until[mob.id] = time.time() + 3

        # ── 4. 드롭 & 인벤토리 업데이트 ──────────────────────────
        if mob_dead:
            now = time.time()
            mob.is_alive = False
            mob.died_at  = now
            knockback_until.pop(mob.id, None)   # 쿨타임 정보 정리

            # 경험치 보상 (간단히 몬스터 레벨 * EXP_PER_LEVEL)
            gained = mob.level * EXP_PER_LEVEL
            prev_lv = char.level
            char.gain_exp(gained)
            level_up = char.level > prev_lv
            # 클라이언트에 알림
            socketio.emit('exp_gain', {
                "char_id": char.id, "exp": gained,
                "total_exp": char.exp, "level": char.level, "level_up": level_up,
                "hp": char.hp, "max_hp": char.max_hp,
                "mp": char.mp, "max_mp": char.max_mp,
            }, room=f"map_{new_map}")
            
            if mob.drop_item_id:                           # NULL 가드
                # race-safe upsert: INSERT ON CONFLICT UPDATE
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                stmt = pg_insert(CharacterItem).values(
                    character_id=char.id,
                    item_id=mob.drop_item_id,
                    quantity=1,
                ).on_conflict_do_update(
                    constraint='uq_char_item',
                    set_={'quantity': CharacterItem.quantity + 1},
                )
                db.session.execute(stmt)

            db.session.commit()                                # === 트랜잭션 끝 ===

        # ── 5. 결과 브로드캐스트 ─────────────────────────────────
        socketio.emit('monster_hit',
                    {'id' : mob.id,
                    'attacker_id': char_id,
                    'dmg': dmg,
                    'hp' : mob.hp,
                    'x'  : mob.x,
                    'y'  : mob.y},
                    room=f"map_{new_map}")

        if mob.hp == 0:
            socketio.emit('monster_despawn',
                        {'id': mob.id},
                        room=f"map_{new_map}")
        
        db.session.commit()
        latest_map = char.map_key      # char 는 아직 attached 상태
        update_sid_map(request.sid, latest_map)   # ▼ 2) Redis 갱신

        db.session.remove()        # ★ **딱 한 번, 맨 끝에서 세션 해제**

    # ③ 맵 퇴장 또는 브라우저 종료
    @socketio.on('disconnect')
    def on_disconnect():
        try:
            # 현재 세션에서 sid 가져오기 시도
            sid = request.sid
        except Exception:
            # 실패 시 기본 에러 처리
            print("disconnect 중 오류 발생 - SID를 얻을 수 없음")
            return
        
        # Redis 또는 데이터베이스에서 모든 키를 문자열로 처리하도록 조정
        try:
            char_id = remove_sid(sid)
            if char_id is None:
                return
                
            # 모든 ID를 문자열로 안전하게 변환
            safe_char_id = str(char_id.decode('utf-8') if isinstance(char_id, bytes) else char_id)
            
            map_key = get_map_by_sid(sid) or "unknown"
            safe_map_key = str(map_key.decode('utf-8') if isinstance(map_key, bytes) else map_key)
            
            # 안전한 값으로 이벤트 발송
            room_name = f"map_{safe_map_key}"
            leave_room(room_name, sid=sid)
            emit("player_despawn", {"id": safe_char_id}, room=room_name)
            print(f"disconnect sid={sid} char_id={safe_char_id} map_key={safe_map_key}")
        except Exception as e:
            print(f"disconnect 처리 중 오류 발생: {e}")


    # Blueprint 등록
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(characters_bp, url_prefix='/api')
    app.register_blueprint(npcs_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api')
    app.register_blueprint(shop_bp, url_prefix='/api')
    app.register_blueprint(admin_auth_bp, url_prefix='/auth')  # /auth/admin_login
    app.register_blueprint(maps_bp, url_prefix='/api')
    app.register_blueprint(monsters_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return "Hello, This is Flask+SQLAlchemy+PostgreSQL Example"

    return app, socketio

if __name__ == '__main__':
    app, socketio = create_app()
    with app.app_context():
        # ❗ 중요: 기존 테이블 DROP 후 CREATE (개발 환경에서만)
        #db.drop_all()
        db.create_all()

        # ── 기존 중복 CharacterItem 레코드 통합 (1회성 마이그레이션) ──
        from sqlalchemy import func
        dupes = (
            db.session.query(
                CharacterItem.character_id,
                CharacterItem.item_id,
                func.count(CharacterItem.id).label('cnt'),
                func.sum(CharacterItem.quantity).label('total_qty'),
                func.min(CharacterItem.id).label('keep_id'),
            )
            .group_by(CharacterItem.character_id, CharacterItem.item_id)
            .having(func.count(CharacterItem.id) > 1)
            .all()
        )
        for d in dupes:
            print(f'[migration] 중복 통합: char={d.character_id} item={d.item_id} '
                  f'cnt={d.cnt} → qty={d.total_qty}')
            # 보존할 행의 수량을 합산값으로 갱신
            CharacterItem.query.filter_by(id=d.keep_id).update(
                {'quantity': d.total_qty})
            # 나머지 중복 행 삭제
            CharacterItem.query.filter(
                CharacterItem.character_id == d.character_id,
                CharacterItem.item_id == d.item_id,
                CharacterItem.id != d.keep_id,
            ).delete()
        if dupes:
            db.session.commit()
            print(f'[migration] {len(dupes)}건 중복 통합 완료')

        # unique constraint 추가 (이미 있으면 스킵)
        exists = db.session.execute(db.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'uq_char_item' "
            "AND table_name = 'character_items'"
        )).fetchone()
        if not exists:
            db.session.execute(db.text(
                'ALTER TABLE character_items '
                'ADD CONSTRAINT uq_char_item UNIQUE (character_id, item_id)'
            ))
            db.session.commit()
            print('[migration] uq_char_item 제약조건 추가 완료')
        else:
            print('[migration] uq_char_item 제약조건 이미 존재 — 스킵')

        # 예: Greenfield NPC들을 DB에 미리 추가 (개발용)
        # 1) NPC 시드
        if NPC.query.count() == 0:
            seed_npcs = [
                NPC(name='Marina Field', gender='Female', race='Human', job='Guard', map_key='city2',
                    x=11, y=2, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Iris Gale', gender='Female', race='Elf', job='Guard', map_key='city2',
                    x=11, y=28, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Holt Bram', gender='Male', race='Human', job='Guard', map_key='city2',
                    x=15, y=2, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Flora Plain', gender='Female', race='Human', job='Farmer', map_key='city2',
                    x=3, y=4, dialog='곡물을 재배하고 있어요. 도와주실래요?', npc_type='normal'),
                NPC(name='Roderick Hay', gender='Male', race='Human', job='Stable Master', map_key='city2',
                    x=5, y=19, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Colette Water', gender='Female', race='Elf', job='Well Keeper', map_key='city2',
                    x=14, y=14, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Rose Malt', gender='Female', race='Human', job='Innkeeper', map_key='city2',
                    x=2, y=26, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Evelyn Sprout', gender='Female', race='Human', job='Crop Researcher', map_key='city2',
                    x=25, y=3, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Tessa Bloom', gender='Female', race='Human', job='Flower Vendor', map_key='city2',
                    x=23, y=11, dialog='안녕하세요!', npc_type='normal'),
                # 10번째 → shop
                NPC(name='Garrett Leaf', gender='Male', race='Human', job='Traveling Merchant', map_key='city2',
                    x=10, y=11, dialog='안녕하세요! 물건을 구경해 보실래요?', npc_type='shop')
            ]
            db.session.bulk_save_objects(seed_npcs)
            db.session.commit()
        
        # 2) 아이템 시드
        if Item.query.count() == 0:
            seed_items = [
                # --- 몬스터 드롭 아이템 (sell only) ---
                Item(name='Slime Jelly (슬라임 젤)', category='drop', description='슬라임의 젤, 판매용', sell_price=5,  buy_price=0),
                Item(name='Boar Meat (멧돼지 고기)', category='drop', description='멧돼지 고기, 식재료같지만 사용X', sell_price=8,  buy_price=0),
                Item(name='Wolf Fang (늑대 이빨)',  category='drop', description='날카로운 이빨',    sell_price=12, buy_price=0),
                Item(name='Ice Crystal (얼음 결정)', category='drop', description='차가운 수정',       sell_price=15, buy_price=0),
                Item(name='Scorpion Stinger (전갈 독침)', category='drop', description='독침, 판매용', sell_price=10, buy_price=0),
                Item(name='Desert Bandit Gear (도적장비)', category='drop', description='도적이 쓰던 허접한 장비', sell_price=14, buy_price=0),
                Item(name='Beetle Shell (딱정벌레 껍질)', category='drop', description='단단한 껍질',  sell_price=11, buy_price=0),
                Item(name='Corrupted Bandage (부패 붕대)', category='drop', description='언데드 저주 붕대', sell_price=16, buy_price=0),
                Item(name='Ancient Metal Shard (고대 금속 파편)', category='drop', description='고가치 소재지만 제작X', sell_price=25, buy_price=0),
                Item(name='Sea Crab Shell (게 껍데기)',   category='drop', description='게 껍데기, 식용 불가', sell_price=9,  buy_price=0),
                Item(name='Sea Serpent Scale (바다 뱀 비늘)', category='drop', description='희귀 비늘, 판매만 가능', sell_price=20, buy_price=0),

                # --- 포션/소비아이템 (buy only) ---
                Item(name='Small HP Potion',  category='potion', description='HP 50 회복',      buy_price=10, sell_price=0, effect_value=50),
                Item(name='Medium HP Potion', category='potion', description='HP 120 회복',     buy_price=25, sell_price=0, effect_value=120),
                Item(name='Large HP Potion',  category='potion', description='HP 250 회복',     buy_price=60, sell_price=0, effect_value=250),
                Item(name='Antidote',         category='potion', description='독 해제 포션',     buy_price=15, sell_price=0),
                Item(name='Stamina Drink',    category='potion', description='1분간 이동속+10%', buy_price=20, sell_price=0),

                # --- 무기 (weapon) ---
                Item(name='Basic Sword',      category='weapon', description='물리 공격력 +5',   buy_price=30, sell_price=0, attack_power=5),
                Item(name='Iron Sword',       category='weapon', description='물리 공격력 +10',  buy_price=80, sell_price=0, attack_power=10),
                Item(name='Basic Bow',        category='weapon', description='물리 공격력 +5(원거리)', buy_price=35, sell_price=0, attack_power=5),
                Item(name='Long Bow',         category='weapon', description='물리 공격력 +10(원거리)', buy_price=85, sell_price=0, attack_power=10),
                Item(name='Basic Staff',      category='weapon', description='마법 공격력 +5',    buy_price=40, sell_price=0, attack_power=5),
                Item(name='Enchanted Staff',  category='weapon', description='마법 공격력 +12',  buy_price=120, sell_price=0, attack_power=12),

                # --- 방어구 (armor) ---
                Item(name='Leather Armor',    category='armor', description='방어력+5(가죽)',    buy_price=25, sell_price=0, defense_power=5),
                Item(name='Iron Armor',       category='armor', description='방어력+10(철)',     buy_price=70, sell_price=0, defense_power=10),
                Item(name='Scale Armor',      category='armor', description='방어력+15(비늘)',   buy_price=120, sell_price=0, defense_power=15),
                Item(name='Mystic Robe',      category='armor', description='방어+5, 마법공+3',  buy_price=90, sell_price=0, defense_power=5, attack_power=3),
            ]
            db.session.bulk_save_objects(seed_items)
            db.session.commit()
        
        # 3) Map 시드
        if Map.query.count() == 0:
            seed_maps = [
                Map(
                    key='worldmap',
                    display_name='World Map',
                    json_file='worldmap.json',
                    tileset_file='tmw_grass_spacing.png',
                    tile_width=128,
                    tile_height=128,
                    width=40,
                    height=60,
                    map_data='''{
                        "start_position": [6,12],
                        "teleports": [
                            {
                                "from": {"x":14,"y":15},
                                "to_map":"city2",
                                "to_position":[13,2]
                            },
                            {
                                "from": {"x":12,"y":8},
                                "to_map":"dungeon1",
                                "to_position":[10,2]
                            }
                        ]
                    }'''
                ),
                Map(
                    key='city2',
                    display_name='Greenfield City',
                    json_file='city2.json',
                    tileset_file='tmw_city_spacing.png',
                    tile_width=128,
                    tile_height=128,
                    width=20,
                    height=30,
                    map_data='''{
                        "start_position": [13,2],
                        "teleports": [
                            {
                                "from":{"y":0,"xRange":[11,15]},
                                "to_map":"worldmap",
                                "to_position":[13,15]
                            },
                            {
                                "from":{"y":29,"xRange":[11,15]},
                                "to_map":"worldmap",
                                "to_position":[13,15]
                            }
                        ]
                    }'''
                ),
                Map(
                    key='dungeon1',
                    display_name='Ice Cavern',
                    json_file='dungeon1.json',
                    tileset_file='tmw_dungeon_spacing.png',
                    tile_width=128,
                    tile_height=128,
                    width=20,
                    height=30,
                    map_data='''{
                        "start_position": [10,2],
                        "teleports": [
                            {
                                "from":{"y":0,"xRange":[8,12]},
                                "to_map":"worldmap",
                                "to_position":[12,9]
                            }
                        ]
                    }'''
                )
            ]
            db.session.bulk_save_objects(seed_maps)
            db.session.commit()
        
        if Monster.query.count() == 0:
            # 드롭 아이템 FK 먼저 가져오기
            get_item = lambda n: db.session.execute(
                select(Item).filter_by(name=n)
            ).scalar_one()

            seed_monsters = [
                Monster(name='Slime #1', species='Slime', level=14,
                        map_key='dungeon1', x=4,  y=15,
                        spawn_x=4, spawn_y=15, respawn_s=15,
                        hp=120, max_hp=120, attack=8, defense=2,
                        drop_item=get_item('Slime Jelly (슬라임 젤)')),
                Monster(name='Slime #2', species='Slime', level=14,
                        map_key='dungeon1', x=16, y=15,
                        spawn_x=16, spawn_y=15, respawn_s=15,
                        hp=120, max_hp=120, attack=8, defense=2,
                        drop_item=get_item('Slime Jelly (슬라임 젤)')),
                Monster(name='Snow Wolf #1', species='SnowWolf', level=15,
                        map_key='dungeon1', x=6,  y=20,
                        spawn_x=6, spawn_y=20, respawn_s=20,
                        hp=260, max_hp=260, attack=22, defense=6,
                        drop_item=get_item('Wolf Fang (늑대 이빨)')),
                Monster(name='Snow Wolf #2', species='SnowWolf', level=15,
                        map_key='dungeon1', x=14, y=21,
                        spawn_x=14, spawn_y=21, respawn_s=20,
                        hp=260, max_hp=260, attack=22, defense=6,
                        drop_item=get_item('Wolf Fang (늑대 이빨)')),
                Monster(name='Ice Golem #1', species='IceGolem', level=17,
                        map_key='dungeon1', x=8,  y=26,
                        spawn_x=8, spawn_y=26, respawn_s=30,
                        hp=680, max_hp=680, attack=40, defense=18, mp=50, max_mp=50,
                        drop_item=get_item('Ice Crystal (얼음 결정)')),
            ]
            db.session.add_all(seed_monsters) 
            db.session.commit()

    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true")
    socketio.run(app,
                 host='0.0.0.0',
                 port=5000,
                 debug=debug,
                 )
