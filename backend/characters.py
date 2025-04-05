# characters.py

from flask import Blueprint, request, jsonify
from models import db, Character, User

characters_bp = Blueprint('characters', __name__)

# 최대 캐릭터 슬롯
MAX_CHARACTERS_PER_USER = 3

# 허용 직업 리스트
VALID_JOBS = ['warrior', 'archer', 'mage']

# 예: 전사는 HP +20, 마법사는 MP +20, 궁수는 둘 다 보통
def get_default_stats_for_job(job: str):
    # 단순 예시
    job = job.lower()
    if job == 'warrior':
        return {'hp': 120, 'mp': 50}
    elif job == 'mage':
        return {'hp': 80, 'mp': 80}
    elif job == 'archer':
        return {'hp': 100, 'mp': 60}
    else:
        return {'hp': 100, 'mp': 50}  # 기본

@characters_bp.route('/characters', methods=['POST'])
def create_character():
    """
    캐릭터 생성 API
    요청 JSON 예시:
    {
      "user_id": 1,
      "name": "Alice",
      "job": "archer",
      "gender": "female",
      "hair_color": "brown"
    }
    """
    data = request.get_json() or {}

    user_id = data.get('user_id')
    name = data.get('name', '').strip()
    job = data.get('job', 'warrior').lower()       # 디폴트: 전사
    # 직업 검사 ...
    base_stats = get_default_stats_for_job(job)

    gender = data.get('gender', 'female').lower()  # 디폴트: 여성
    hair_color = data.get('hair_color', 'blonde').lower()  # 디폴트: 금발

    # 1) 유저 존재 여부 확인
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Invalid user_id'}), 400

    # 2) 캐릭터 슬롯 제한 (예: 최대 3개)
    existing_count = Character.query.filter_by(user_id=user_id).count()
    if existing_count >= MAX_CHARACTERS_PER_USER:
        return jsonify({'error': 'Max character limit reached'}), 400

    # 3) 캐릭터 이름 중복 체크
    if Character.query.filter_by(name=name).first():
        return jsonify({'error': 'Character name already exists'}), 400

    # 4) 직업 유효성 체크
    if job not in VALID_JOBS:
        return jsonify({'error': f'Invalid job. must be one of {VALID_JOBS}'}), 400

    # (이름 형식/길이 체크: 2~12자 등)
    if len(name) < 2 or len(name) > 12:
        return jsonify({'error': 'Character name length must be 2~12'}), 400

    # 캐릭터 생성
    new_char = Character(
        user_id=user_id,
        name=name,
        job=job,
        gender=gender,
        hair_color=hair_color,

        hp=base_stats['hp'],
        max_hp=base_stats['hp'],
        mp=base_stats['mp'],
        max_mp=base_stats['mp'],
        level=1,
        exp=0
    )
    db.session.add(new_char)
    db.session.commit()

    return jsonify({
        'message': 'Character created',
        'character': new_char.to_dict()
    }), 201


@characters_bp.route('/characters', methods=['GET'])
def list_characters():
    """
    캐릭터 목록 조회
    /characters?user_id=1 → 해당 유저의 캐릭터 목록
    """
    user_id = request.args.get('user_id', type=int)
    query = Character.query

    if user_id:
        query = query.filter_by(user_id=user_id)

    chars = query.all()
    return jsonify([c.to_dict() for c in chars])


@characters_bp.route('/characters/<int:char_id>', methods=['GET'])
def get_character(char_id):
    """
    캐릭터 상세 조회
    """
    char = Character.query.get_or_404(char_id)
    return jsonify(char.to_dict())


@characters_bp.route('/characters/<int:char_id>', methods=['PUT'])
def update_character(char_id):
    """
    캐릭터 수정 API
    - 일반적으로 job/level 변경은 불가(또는 별도 로직)
    - 여기서는 name, gender, hair_color 등만 업데이트 가능(기획에 따라 조절)
    요청 JSON:
    {
      "name": "Alice2",
      "gender": "male",
      "hair_color": "red"
    }
    """
    char = Character.query.get_or_404(char_id)
    data = request.get_json() or {}

    # 이름 변경 허용 시 (중복 검사)
    new_name = data.get('name')
    if new_name:
        new_name = new_name.strip()
        if len(new_name) < 2 or len(new_name) > 12:
            return jsonify({'error': 'Character name length must be 2~12'}), 400

        # 중복 체크 (자기 자신 제외)
        existing = Character.query.filter(
            Character.name == new_name, Character.id != char.id
        ).first()
        if existing:
            return jsonify({'error': 'Character name already exists'}), 400
        char.name = new_name

    # gender, hair_color 등 외형 수정
    if 'gender' in data:
        char.gender = data['gender'].lower()
    if 'hair_color' in data:
        char.hair_color = data['hair_color'].lower()

    # 예: job, level은 수정 금지(생략)
    # if 'job' in data:
    #   return 에러 or 무시

    db.session.commit()
    return jsonify({
        'message': 'Character updated',
        'character': char.to_dict()
    })


@characters_bp.route('/characters/<int:char_id>', methods=['DELETE'])
def delete_character(char_id):
    """
    캐릭터 삭제
    """
    char = Character.query.get_or_404(char_id)
    db.session.delete(char)
    db.session.commit()
    return jsonify({'message': 'Character deleted'})


@characters_bp.route('/characters/<int:char_id>/gain_exp', methods=['PATCH'])
def gain_exp(char_id):
    """
    특정 캐릭터에게 경험치를 추가하고, 레벨업 로직 적용.
    요청 JSON 예시:
    {
      "amount": 150
    }
    """
    char = Character.query.get_or_404(char_id)
    data = request.get_json() or {}
    amount = data.get('amount', 0)

    char.gain_exp(amount)
    db.session.commit()

    return jsonify({
        'message': f'Gained {amount} exp',
        'character': char.to_dict()
    }), 200


@characters_bp.route('/characters/<int:char_id>/stats', methods=['PATCH'])
def update_stats(char_id):
    """
    HP/MP, status_effects 등 일부 스탯을 업데이트하는 예시.
    예: 
    {
      "hp": 80,
      "mp": 40,
      "status_effects": "poison"
    }
    """
    char = Character.query.get_or_404(char_id)
    data = request.get_json() or {}

    if 'hp' in data:
        char.hp = min(data['hp'], char.max_hp)
    if 'mp' in data:
        char.mp = min(data['mp'], char.max_mp)
    if 'status_effects' in data:
        # 실제로는 JSON 파싱/검증 등을 거칠 수도 있음
        char.status_effects = str(data['status_effects'])

    db.session.commit()
    return jsonify({
        'message': 'Stats updated',
        'character': char.to_dict()
    }), 200