from flask import Flask
from config import Config
from models import db
from routes import bp as api_bp
from auth import auth_bp
from characters import characters_bp  # 우리가 만든 새 블루프린트

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # 기존
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')

    # ★ 캐릭터 API
    app.register_blueprint(characters_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return "Hello, This is Flask+SQLAlchemy+PostgreSQL Example"

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # ❗ 중요: 기존 테이블 DROP 후 CREATE (개발 환경에서만)
        db.drop_all()
        db.create_all()

    app.run(host='0.0.0.0', port=5000, debug=True)
