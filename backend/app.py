from flask import Flask
from config import Config
from models import db
from routes import bp as api_bp
from auth import auth_bp  # 새로 만든 auth 라우트

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # 기존 users API (CRUD)
    app.register_blueprint(api_bp, url_prefix='/api')

    # 새로 만든 auth API (회원가입/로그인)
    app.register_blueprint(auth_bp, url_prefix='/auth')

    @app.route('/')
    def index():
        return "Hello, This is Flask+SQLAlchemy+PostgreSQL Example"

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # ❗ 중요: 기존 테이블 DROP 후 CREATE (개발 환경에서만)
        #db.drop_all()
        db.create_all()

    app.run(host='0.0.0.0', port=5000, debug=True)
