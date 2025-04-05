# npcs.py

from flask import Blueprint, request, jsonify
from models import db, NPC

npcs_bp = Blueprint('npcs', __name__)

# 1) NPC 목록 조회
@npcs_bp.route('/npcs', methods=['GET'])
def list_npcs():
    """
    예: GET /api/npcs?map_key=city2&active=true
    """
    query = NPC.query
    map_key = request.args.get('map_key')
    active_str = request.args.get('active')  # 'true'/'false'

    if map_key:
        query = query.filter_by(map_key=map_key)
    if active_str == 'true':
        query = query.filter_by(is_active=True)
    elif active_str == 'false':
        query = query.filter_by(is_active=False)

    npcs = query.all()
    return jsonify([n.to_dict() for n in npcs])


# 2) NPC 상세 조회
@npcs_bp.route('/npcs/<int:npc_id>', methods=['GET'])
def get_npc(npc_id):
    npc = NPC.query.get_or_404(npc_id)
    return jsonify(npc.to_dict())


# 3) NPC 생성 (관리자 용)
@npcs_bp.route('/npcs', methods=['POST'])
def create_npc():
    """
    요청 JSON 예시:
    {
      "name": "Marina Field",
      "gender": "Female",
      "race": "Human",
      "job": "Guard",
      "map_key": "city2",
      "x": 1280,
      "y": 1536,
      "dialog": "어서오세요! 이곳은 Greenfield입니다."
    }
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    npc = NPC(
        name=name,
        gender=data.get('gender', 'female'),
        race=data.get('race', 'Human'),
        job=data.get('job', 'Guard'),
        map_key=data.get('map_key', 'city2'),
        x=data.get('x', 0),
        y=data.get('y', 0),
        dialog=data.get('dialog', '안녕하세요!')
    )
    db.session.add(npc)
    db.session.commit()

    return jsonify({'message': 'NPC created', 'npc': npc.to_dict()}), 201


# 4) NPC 수정 (관리자 용)
@npcs_bp.route('/npcs/<int:npc_id>', methods=['PUT'])
def update_npc(npc_id):
    npc = NPC.query.get_or_404(npc_id)
    data = request.get_json() or {}

    npc.name = data.get('name', npc.name)
    npc.gender = data.get('gender', npc.gender)
    npc.race = data.get('race', npc.race)
    npc.job = data.get('job', npc.job)
    npc.map_key = data.get('map_key', npc.map_key)
    npc.x = data.get('x', npc.x)
    npc.y = data.get('y', npc.y)
    npc.dialog = data.get('dialog', npc.dialog)
    # 활성/비활성
    if 'is_active' in data:
        npc.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({'message': 'NPC updated', 'npc': npc.to_dict()})


# 5) NPC 삭제 (관리자 용)
@npcs_bp.route('/npcs/<int:npc_id>', methods=['DELETE'])
def delete_npc(npc_id):
    npc = NPC.query.get_or_404(npc_id)
    db.session.delete(npc)
    db.session.commit()
    return jsonify({'message': 'NPC deleted'})


# 6) NPC와 "대화" API (간단 예시)
@npcs_bp.route('/npcs/<int:npc_id>/dialog', methods=['GET'])
def get_npc_dialog(npc_id):
    """
    클라이언트가 GET /api/npcs/<id>/dialog 로 호출하면,
    해당 NPC의 대사를 반환해준다.
    상점/퀘스트 기능 없이 "안녕하세요!" 정도만.
    """
    npc = NPC.query.get_or_404(npc_id)
    if not npc.is_active:
        return jsonify({'error': 'NPC is not active'}), 400

    return jsonify({
        'npc_id': npc.id,
        'npc_name': npc.name,
        'dialog': npc.dialog
    })
