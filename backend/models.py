from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True)
    bio = db.Column(db.Text)

    # ★ 비밀번호 해시용 칼럼 추가
    password_hash = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, username, email=None, bio=None):
        self.username = username
        self.email = email
        self.bio = bio

    def set_password(self, password: str):
        """비밀번호를 해시하여 저장"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """입력받은 비밀번호가 해시와 일치하는지 확인"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'bio': self.bio,
            # 보안상 password_hash는 내려주지 않음
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
