from functools import wraps
from models import db


def with_db_session(f):
    """Socket.IO 핸들러에서 db.session 정리를 보장하는 데코레이터.

    - 정상 반환/조기 반환: finally에서 db.session.remove()
    - 예외 발생: except에서 rollback() 후 finally에서 remove()
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception:
            db.session.rollback()
            raise
        finally:
            db.session.remove()
    return wrapper
