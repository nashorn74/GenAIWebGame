from flask import Flask
from config import Config
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Character
from routes import bp as api_bp
from auth import auth_bp
from characters import characters_bp  # 우리가 만든 새 블루프린트

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

    # 기존
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')

    # ★ 캐릭터 API
    app.register_blueprint(characters_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return "Hello, This is Flask+SQLAlchemy+PostgreSQL Example"

    return app, socketio

if __name__ == '__main__':
    app, socketio = create_app()
    with app.app_context():
        # ❗ 중요: 기존 테이블 DROP 후 CREATE (개발 환경에서만)
        db.drop_all()
        db.create_all()

    # socketio 인스턴스를 create_app 내부에서 반환하게 하거나, 전역으로 만들어야 함
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
