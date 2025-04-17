from flask import Flask
from flask_cors import CORS
from config import Config
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Character, NPC, Item, Map
from routes import bp as api_bp
from auth import auth_bp
from auth_admin import admin_auth_bp
from characters import characters_bp
from npcs import npcs_bp
from items import items_bp
from shop import shop_bp
from maps import maps_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio = SocketIO(app)

    CORS(app)

    @socketio.on('join_map')
    def handle_join_map(data):
        # data = { "character_id": 123 }
        char_id = data['character_id']
        char = Character.query.get(char_id)
        if not char: return

        # 소켓 방(room) = 맵 이름
        room_name = f"map_{char.map_key}"
        join_room(room_name)

        # 나의 현재 정보 브로드캐스트 (optional)
        emit('player_joined', {'character': char.to_dict()}, room=room_name)

    @socketio.on('move')
    def handle_move(data):
        # data = { "character_id": 123, "map_key": "city2", "x": 1500, "y": 2300 }
        char_id = data['character_id']
        new_map_key = data['map_key']
        new_x = data['x']
        new_y = data['y']

        char = Character.query.get(char_id)
        if not char: return

        # 맵이 바뀌었다면 기존 room을 떠나고 새 room join
        if new_map_key != char.map_key:
            leave_room(f"map_{char.map_key}")
            join_room(f"map_{new_map_key}")

        # DB에 좌표 업데이트
        char.map_key = new_map_key
        char.x = new_x
        char.y = new_y
        db.session.commit()

        # 같은 맵에 있는 모든 클라이언트에게 broadcast
        room_name = f"map_{new_map_key}"
        emit('player_moved', {'character_id': char_id, 'x': new_x, 'y': new_y}, room=room_name)

    # Blueprint 등록
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(characters_bp, url_prefix='/api')
    app.register_blueprint(npcs_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api')
    app.register_blueprint(shop_bp, url_prefix='/api')
    app.register_blueprint(admin_auth_bp, url_prefix='/auth')  # /auth/admin_login
    app.register_blueprint(maps_bp, url_prefix='/api')

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
                    x=1400, y=600, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Iris Gale', gender='Female', race='Elf', job='Guard', map_key='city2',
                    x=1300, y=700, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Holt Bram', gender='Male', race='Human', job='Guard', map_key='city2',
                    x=1350, y=750, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!', npc_type='normal'),
                NPC(name='Flora Plain', gender='Female', race='Human', job='Farmer', map_key='city2',
                    x=1600, y=820, dialog='곡물을 재배하고 있어요. 도와주실래요?', npc_type='normal'),
                NPC(name='Roderick Hay', gender='Male', race='Human', job='Stable Master', map_key='city2',
                    x=1650, y=880, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Colette Water', gender='Female', race='Elf', job='Well Keeper', map_key='city2',
                    x=1500, y=1000, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Rose Malt', gender='Female', race='Human', job='Innkeeper', map_key='city2',
                    x=1670, y=1200, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Evelyn Sprout', gender='Female', race='Human', job='Crop Researcher', map_key='city2',
                    x=1800, y=980, dialog='안녕하세요!', npc_type='normal'),
                NPC(name='Tessa Bloom', gender='Female', race='Human', job='Flower Vendor', map_key='city2',
                    x=1850, y=760, dialog='안녕하세요!', npc_type='normal'),
                # 10번째 → shop
                NPC(name='Garrett Leaf', gender='Male', race='Human', job='Traveling Merchant', map_key='city2',
                    x=1100, y=650, dialog='안녕하세요! 물건을 구경해 보실래요?', npc_type='shop')
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
                    display_name='Dungeon 1',
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

    # socketio 인스턴스를 create_app 내부에서 반환하게 하거나, 전역으로 만들어야 함
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
