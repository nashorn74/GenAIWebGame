import pytest
from flask import Flask
from flask_cors import CORS
from models import db
from routes import bp as api_bp
from auth import auth_bp
from characters import characters_bp
from npcs import npcs_bp
from items import items_bp
from shop import shop_bp
from maps import maps_bp
from monsters import monsters_bp


@pytest.fixture()
def app():
    """SQLite in-memory DB 를 사용하는 테스트용 Flask 앱."""
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY="test-secret",
    )
    CORS(app)
    db.init_app(app)

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(characters_bp, url_prefix="/api")
    app.register_blueprint(npcs_bp, url_prefix="/api")
    app.register_blueprint(items_bp, url_prefix="/api")
    app.register_blueprint(shop_bp, url_prefix="/api")
    app.register_blueprint(maps_bp, url_prefix="/api")
    app.register_blueprint(monsters_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def session(app):
    """DB 세션 직접 사용이 필요한 모델 테스트용."""
    with app.app_context():
        yield db.session
