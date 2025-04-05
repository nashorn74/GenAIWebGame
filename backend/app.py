from flask import Flask
from config import Config
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Character, NPC
from routes import bp as api_bp
from auth import auth_bp
from characters import characters_bp
from npcs import npcs_bp  # 우리가 만든 NPC Blueprint

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio = SocketIO(app)

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
        # 이미 있으면 스킵
        if NPC.query.count() == 0:
            seed_npcs = [
                NPC(name='Marina Field',   gender='Female', race='Human', job='Guard', map_key='city2', x=1400, y=600, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!'),
                NPC(name='Iris Gale',      gender='Female', race='Elf',   job='Guard', map_key='city2', x=1300, y=700, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!'),
                NPC(name='Holt Bram',      gender='Male',   race='Human', job='Guard', map_key='city2', x=1350, y=750, dialog='Greenfield를 지키는 경비입니다. 반갑습니다!'),
                NPC(name='Flora Plain',    gender='Female', race='Human', job='Farmer', map_key='city2', x=1600, y=820, dialog='곡물을 재배하고 있어요. 도와주실래요?'),
                NPC(name='Roderick Hay',   gender='Male',   race='Human', job='Stable Master', map_key='city2', x=1650, y=880, dialog='안녕하세요!'),
                NPC(name='Colette Water',  gender='Female', race='Elf',   job='Well Keeper', map_key='city2', x=1500, y=1000, dialog='안녕하세요!'),
                NPC(name='Rose Malt',      gender='Female', race='Human', job='Innkeeper', map_key='city2', x=1670, y=1200, dialog='안녕하세요!'),
                NPC(name='Evelyn Sprout',  gender='Female', race='Human', job='Crop Researcher', map_key='city2', x=1800, y=980, dialog='안녕하세요!'),
                NPC(name='Tessa Bloom',    gender='Female', race='Human', job='Flower Vendor', map_key='city2', x=1850, y=760, dialog='안녕하세요!'),
                NPC(name='Garrett Leaf',   gender='Male',   race='Human', job='Traveling Merchant', map_key='city2', x=1100, y=650, dialog='안녕하세요!'),
            ]
            db.session.bulk_save_objects(seed_npcs)
            db.session.commit()

    # socketio 인스턴스를 create_app 내부에서 반환하게 하거나, 전역으로 만들어야 함
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
