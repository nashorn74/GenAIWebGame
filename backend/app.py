from flask import Flask
from config import Config
from models import db
from routes import bp as api_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # SQLAlchemy 초기화
    db.init_app(app)

    # Blueprint 등록
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return "Hello, This is Flask+SQLAlchemy+PostgreSQL Example"

    return app

if __name__ == '__main__':
    app = create_app()

    # DB 테이블 생성 (초기 1회만)
    with app.app_context():
        db.create_all()

    # 서버 실행: host='0.0.0.0'로 지정하여 도커 컨테이너 외부 접근 허용
    app.run(host='0.0.0.0', port=5000, debug=True)
