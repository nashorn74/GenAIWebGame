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

    # user가 가진 캐릭터들
    characters = db.relationship('Character', backref='user', lazy=True)

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

class Character(db.Model):
    __tablename__ = 'characters'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    name = db.Column(db.String(50), unique=True, nullable=False)

    # 직업/성별/외형
    job = db.Column(db.String(20), default='warrior')
    gender = db.Column(db.String(10), default='female')
    hair_color = db.Column(db.String(20), default='blonde')

    # 스탯: HP/MP, 레벨, 경험치
    level = db.Column(db.Integer, default=1)
    exp = db.Column(db.Integer, default=0)

    # 현재 HP/MP, 그리고 최대치 (게임 기획에 맞춰 적용)
    hp = db.Column(db.Integer, default=100)
    max_hp = db.Column(db.Integer, default=100)
    mp = db.Column(db.Integer, default=50)
    max_mp = db.Column(db.Integer, default=50)

    # 버프/디버프 등 상태이상. 예: ["poison","stun"] JSON 문자열 or ","로 구분
    status_effects = db.Column(db.String(255), default='')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'job': self.job,
            'gender': self.gender,
            'hair_color': self.hair_color,
            'level': self.level,
            'exp': self.exp,
            'hp': self.hp,
            'max_hp': self.max_hp,
            'mp': self.mp,
            'max_mp': self.max_mp,
            'status_effects': self.status_effects,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def gain_exp(self, amount: int):
        """
        경험치를 획득 → 레벨업 체크 → HP/MP 등도 상향 조정 가능
        """
        if amount < 0:
            return  # 음수 경험치는 무시

        self.exp += amount

        # 간단한 레벨업 공식 예시: exp >= level*100 넘어갈 때마다 레벨업
        while self.exp >= self.exp_to_next_level():
            self.exp -= self.exp_to_next_level()
            self.level += 1
            # 레벨업 시 HP/MP 최대치 증가 예시
            self.max_hp += 10
            self.max_mp += 5
            # 현재 HP/MP도 같이 올려준다 (기획에 따라 다름)
            self.hp = self.max_hp
            self.mp = self.max_mp

    def exp_to_next_level(self):
        """다음 레벨까지 필요한 경험치 공식"""
        return self.level * 100