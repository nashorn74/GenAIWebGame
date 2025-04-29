from flask import Flask
from flask import request          # ← 추가
from uuid import uuid4
from flask_cors import CORS
from config import Config
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Character, NPC, Item, Map, Monster
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
from utils.walkable import get_walkable
from random import choice, shuffle
import time

sid_to_info: dict[str, dict[str, str|int]] = {}    # ★ {sid:{id, map}}

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

    CORS(app)

    # ─────────────────────────────────────────────
    #  🐾  몬스터 랜덤 이동 루프 (2초 간격)
    # ─────────────────────────────────────────────
    def monster_ai():
        walkable = get_walkable("dungeon1")        # 캐시
        while True:
            socketio.sleep(2.0)

            with app.app_context():
                mobs = Monster.query.filter_by(
                    map_key="dungeon1", is_alive=True
                ).all()

                # ── ① 현재 점유 타일 set ──
                occupied: set[tuple[int, int]] = {(m.x, m.y) for m in mobs}

                shuffle(mobs)                       # 이동 순서 랜덤화
                for m in mobs:
                    # ── ② 네 방향 후보 중 walkable ∩ not-occupied ──
                    cand = [
                        (m.x + 1, m.y),
                        (m.x - 1, m.y),
                        (m.x, m.y + 1),
                        (m.x, m.y - 1),
                    ]
                    cand = [p for p in cand if p in walkable and p not in occupied]

                    if not cand:        # 갈 곳 없으면 stay
                        continue

                    nx, ny = choice(cand)
                    occupied.remove((m.x, m.y))     # 기존 자리 비우고
                    occupied.add((nx, ny))          # 새 자리 점유

                    m.x, m.y = nx, ny
                    socketio.emit(
                        "monster_move",
                        {"id": m.id, "x": nx, "y": ny},
                        room="map_dungeon1",
                    )

                db.session.commit()

    def random_step(x: int, y: int, walkable: set[tuple[int,int]]):
        cand = [(x+1,y), (x-1,y), (x,y+1), (x,y-1)]
        cand = [p for p in cand if p in walkable]
        return choice(cand) if cand else (x, y)

    # Flask-SocketIO 의 헬퍼로 백그라운드 태스크 시작
    socketio.start_background_task(monster_ai)

    @socketio.on('connect')
    def on_connect():
        print('◆ socket connected', request.sid)      # ★ 반드시 떠야 함
    @socketio.on('disconnect')
    def on_disconnect():
        print('◆ socket disconnected', request.sid)      # ★ 반드시 떠야 함

    # ────────────────────────────────────────────────
    # ① 맵 입장
    @socketio.on('join_map')
    def handle_join_map(data):
        char_id     = data['character_id']
        new_map_key = data.get('map_key')          # 프런트가 보낸 맵
        char = Character.query.get(char_id)
        if not char:
            print('[join_map] invalid id', char_id); return

        # 1) DB map_key 동기화
        if new_map_key and new_map_key != char.map_key:
            char.map_key = new_map_key
            db.session.commit()

        # 2) 이미 같은 소켓이 접속 중인가?
        if request.sid in sid_to_info:
            cur_map = sid_to_info[request.sid]['map']

            # ───── ★ 맵이 바뀐 경우 ★ ─────
            if cur_map != char.map_key:
                # 1) 이전 방에 despawn
                emit('player_despawn', {'id': char_id},
                    room=f'map_{cur_map}')

                # 2) room 이동
                leave_room(f'map_{cur_map}')
                join_room(f'map_{char.map_key}')

                # 3) 새 방 플레이어들에게 spawn
                emit('player_spawn', char.to_dict(),
                    room=f'map_{char.map_key}', include_self=False)

                # 👉 4) 새 방에 이미 있는 플레이어 목록을 **본인에게만** 전송
                current = Character.query.filter_by(map_key=char.map_key).all()
                emit('current_players', [c.to_dict() for c in current],
                    room=request.sid)     
                
                # ─────────────────────────────────────────────
                # ★ NEW:  해당 맵의 현재 몬스터 리스트 전송
                monsters = Monster.query.filter_by(map_key=char.map_key, is_alive=True).all()
                emit('current_monsters', [m.to_dict() for m in monsters],
                    room=request.sid)
                # ─────────────────────────────────────────────                 # ★ 핵심

                sid_to_info[request.sid]['map'] = char.map_key
                print(f'↷ {char.name}   {cur_map} → {char.map_key}')
                return      # 여기서 끝

        # 3) ★ 최초 소켓 접속 흐름 (기존 코드 거의 그대로) ─────
        #    - 중복 세션 정리
        #    - 새 room join
        #    - current_players / player_spawn 브로드캐스트
        dup_sid = next((s for s,inf in sid_to_info.items()
                        if inf['id']==char_id), None)
        if dup_sid:
            leave_room(f"map_{sid_to_info[dup_sid]['map']}", sid=dup_sid)
            emit('player_despawn', {'id': char_id},
                room=f"map_{sid_to_info[dup_sid]['map']}")
            sid_to_info.pop(dup_sid, None)

        join_room(f"map_{char.map_key}")
        sid_to_info[request.sid] = {'id': char_id, 'map': char.map_key}
        print(f'▶ {char.name} join map_{char.map_key}')

        # 현재 방 정보 전송
        room = f"map_{char.map_key}"
        current = Character.query.filter_by(map_key=char.map_key).all()
        emit('current_players', [c.to_dict() for c in current])
        emit('player_spawn', char.to_dict(), room=room, include_self=False)

        monsters = Monster.query.filter_by(map_key=char.map_key, is_alive=True).all()
        emit('current_monsters', [m.to_dict() for m in monsters], room=request.sid)

    # ② 이동
    @socketio.on('move')
    def handle_move(data):
        char_id        = data['character_id']
        prev_map_key   = None
        new_map_key    = data['map_key']
        new_x, new_y   = data['x'], data['y']

        char = Character.query.get(char_id)
        if not char:
            return

        # ── ① 맵이 바뀌면 구(舊) 방에 despawn 브로드캐스트 ──
        if new_map_key != char.map_key:
            prev_map_key = char.map_key
            leave_room(f"map_{prev_map_key}")
            emit('player_despawn', {'id': char_id},
                room=f"map_{prev_map_key}")

            join_room(f"map_{new_map_key}")            # 새 방 join
            emit('player_spawn', char.to_dict(),       # 새 방에 spawn
                room=f"map_{new_map_key}", include_self=False)

            # sid_to_info 테이블도 맵키 갱신
            if request.sid in sid_to_info:
                sid_to_info[request.sid]['map'] = new_map_key

        # ── ② DB 위치 업데이트 & 이동 브로드캐스트 ──
        char.map_key, char.x, char.y = new_map_key, new_x, new_y
        db.session.commit()

        emit('player_move', {'id': char_id, 'x': new_x, 'y': new_y},
            room=f"map_{new_map_key}", include_self=False)

    # ③ 맵 퇴장 또는 브라우저 종료
    @socketio.on('disconnect')
    def on_disconnect():
        info = sid_to_info.pop(request.sid, None)
        if not info:
            return
        char = Character.query.get(info['id'])
        if not char:
            return
        room = f"map_{info['map']}"
        leave_room(room)
        emit('player_despawn', {'id': info['id']}, room=room)
        print(f'■ leave {room} (id:{info["id"]})')

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
                        hp=120, max_hp=120, attack=8, defense=2,
                        drop_item=get_item('Slime Jelly (슬라임 젤)')),
                Monster(name='Slime #2', species='Slime', level=14,
                        map_key='dungeon1', x=16, y=15,
                        hp=120, max_hp=120, attack=8, defense=2,
                        drop_item=get_item('Slime Jelly (슬라임 젤)')),
                Monster(name='Snow Wolf #1', species='SnowWolf', level=15,
                        map_key='dungeon1', x=6,  y=20,
                        hp=260, max_hp=260, attack=22, defense=6,
                        drop_item=get_item('Wolf Fang (늑대 이빨)')),
                Monster(name='Snow Wolf #2', species='SnowWolf', level=15,
                        map_key='dungeon1', x=14, y=21,
                        hp=260, max_hp=260, attack=22, defense=6,
                        drop_item=get_item('Wolf Fang (늑대 이빨)')),
                Monster(name='Ice Golem #1', species='IceGolem', level=17,
                        map_key='dungeon1', x=8,  y=26,
                        hp=680, max_hp=680, attack=40, defense=18, mp=50, max_mp=50,
                        drop_item=get_item('Ice Crystal (얼음 결정)')),
            ]
            db.session.bulk_save_objects(seed_monsters)
            db.session.commit()

    # dev 환경이므로 allow_unsafe_werkzeug 옵션 활성
    socketio.run(app,
                 host='0.0.0.0',
                 port=5000,
                 debug=True,
                 allow_unsafe_werkzeug=True)
