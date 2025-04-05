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

    # 맵 / 좌표
    map_key = db.Column(db.String(50), default='worldmap')  # 'worldmap' | 'city2' | 'dungeon1' ...
    x = db.Column(db.Integer, default=0)                    # 캐릭터의 맵 내 X 좌표
    y = db.Column(db.Integer, default=0)                    # 캐릭터의 맵 내 Y 좌표

    # --- 스탯 ---
    str = db.Column(db.Integer, default=10)
    dex = db.Column(db.Integer, default=10)
    intl = db.Column(db.Integer, default=10)  # INT 대신 'intl' 사용 (Python 예약어/가독성)
    # 여기서 원하는 스탯만큼 추가 가능. 또는 JSONField로 한번에 저장할 수도 있음.

    # 보유 골드
    gold = db.Column(db.Integer, default=100)

    # 인벤토리 (CharacterItem)
    items = db.relationship('CharacterItem', backref='character', lazy=True)

    # 버프/디버프 등 상태이상. 예: ["poison","stun"] JSON 문자열 or ","로 구분
    status_effects = db.Column(db.String(255), default='')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        # 각 CharacterItem을 to_dict() 해 주면 item 정보(attack_power 등)까지 포함 가능
        item_list = [char_item.to_dict() for char_item in self.items]

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
            'map_key': self.map_key,
            'x': self.x,
            'y': self.y,
            'str': self.str,
            'dex': self.dex,
            'intl': self.intl,
            'gold': self.gold,   # 보유 골드 표시
            'items': item_list,  # 인벤토리 목록 표시
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

class CharacterItem(db.Model):
    """
    캐릭터가 소지 중인 아이템(인벤토리).
    """
    __tablename__ = 'character_items'

    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)

    # 관계
    item = db.relationship('Item', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'character_id': self.character_id,
            'item_id': self.item_id,
            'quantity': self.quantity,
            'item': self.item.to_dict() if self.item else None
        }

class Map(db.Model):
    __tablename__ = 'maps'
    key = db.Column(db.String(50), primary_key=True)  # 'worldmap', 'city2', 'dungeon1'
    display_name = db.Column(db.String(100))
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    # tiled json 경로, 음악, 기타 설정 등

# ★ NPC 모델
class NPC(db.Model):
    __tablename__ = 'npcs'
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(10), default='female')  # 예) female/male
    race = db.Column(db.String(20), default='Human')
    job = db.Column(db.String(50), default='Guard')

    # 어떤 맵에 있는지 (예: 'city2' / 'worldmap' 등)
    map_key = db.Column(db.String(50), default='city2')

    # 맵 내 좌표
    x = db.Column(db.Integer, default=0)
    y = db.Column(db.Integer, default=0)

    # 간단한 대사 (더 복잡한 스크립트는 별도 DB나 JSON으로 확장)
    dialog = db.Column(db.Text, default='안녕하세요!')

    # 활성/비활성, 생성일시
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'gender': self.gender,
            'race': self.race,
            'job': self.job,
            'map_key': self.map_key,
            'x': self.x,
            'y': self.y,
            'dialog': self.dialog,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Item(db.Model):
    """
    게임 내 아이템. 몬스터 드롭용 / 상점 판매용 / 장비 / 소비아이템 등 모두 포함.
    """
    __tablename__ = 'items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)          # 아이템 이름 (e.g. "Slime Jelly")
    category = db.Column(db.String(50), nullable=False)       # "drop", "potion", "weapon", "armor", etc.
    description = db.Column(db.String(255), default='')       # 툴팁 문구

    # 상점 구매가 (buy_price), 상점 판매가 (sell_price)
    # 질문 기획에선 "몬스터드롭아이템"은 sell_price만 있고 buy_price는 없음.
    buy_price = db.Column(db.Integer, default=0)   # 상점에서 구매시 가격 (포션/무기/방어구)
    sell_price = db.Column(db.Integer, default=0)  # 몬스터 드롭 아이템 판매가

    # 장비(weapon/armor)일 때만 사용. 예: 공격력, 방어력, ...
    attack_power = db.Column(db.Integer, default=0)
    defense_power = db.Column(db.Integer, default=0)
    # 포션 효과, 등. (HP회복량, 해독, etc.)
    effect_value = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'buy_price': self.buy_price,
            'sell_price': self.sell_price,
            'attack_power': self.attack_power,
            'defense_power': self.defense_power,
            'effect_value': self.effect_value
        }