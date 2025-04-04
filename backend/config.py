import os

class Config:
    # 도커 환경에서 'DATABASE_URI' 환경변수를 사용하고,
    # 없으면 기본값으로 localhost 등을 설정 (개발 로컬용)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URI",
        "postgresql://username:password@localhost:5432/my_database"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'some_random_secret_key'
