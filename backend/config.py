# config.py
import os

class Config:
    # ──────────────────────────────────────────────
    # 기본 DB URI – 도커 환경에서는 env 로 덮어씀
    # ──────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URI",
        "postgresql://username:password@localhost:5432/my_database"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "some_random_secret_key"

    # ──────────────────────────────────────────────
    # NEW: DB Connection-Pool 설정
    #  • pool_size      : 항상 유지하는 커넥션 수
    #  • max_overflow   : pool_size 초과 허용 커넥션 수
    #  • pool_timeout   : 커넥션 못 얻으면 몇 초 후 TimeoutError
    #  • pool_recycle   : N초 지나면 커넥션을 재연결(오래된 idle 끊기 방지)
    # ──────────────────────────────────────────────
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size":     int(os.environ.get("DB_POOL_SIZE",     20)),
        "max_overflow":  int(os.environ.get("DB_MAX_OVERFLOW",  30)),
        "pool_timeout":  int(os.environ.get("DB_POOL_TIMEOUT",  30)),
        "pool_recycle":  int(os.environ.get("DB_POOL_RECYCLE", 1800)),
    }
