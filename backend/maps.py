# maps.py
from flask import Blueprint, request, jsonify
from models import db, Map

maps_bp = Blueprint('maps', __name__)

# 1) 맵 목록
@maps_bp.route('/maps', methods=['GET'])
def list_maps():
    """
    GET /api/maps
    """
    maps = Map.query.all()
    return jsonify([m.to_dict() for m in maps])

# 2) 맵 상세
@maps_bp.route('/maps/<string:map_key>', methods=['GET'])
def get_map(map_key):
    m = Map.query.get_or_404(map_key)
    return jsonify(m.to_dict())

# 3) 맵 생성
@maps_bp.route('/maps', methods=['POST'])
def create_map():
    """
    예:
    {
      "key": "city2",
      "display_name": "Greenfield City",
      "json_file": "city2.json",
      "tileset_file": "tmw_city_spacing.png",
      "tile_width": 128,
      "tile_height": 128,
      "width": 40,
      "height": 30
    }
    """
    data = request.get_json() or {}
    map_key = data.get('key', '').strip()
    if not map_key:
        return jsonify({'error': 'key is required'}), 400
    
    # 중복 체크
    existing = Map.query.get(map_key)
    if existing:
        return jsonify({'error': 'Map key already exists'}), 400

    new_map = Map(
        key=map_key,
        display_name=data.get('display_name', map_key),
        json_file=data.get('json_file', ''),
        tileset_file=data.get('tileset_file', ''),
        tile_width=data.get('tile_width', 128),
        tile_height=data.get('tile_height', 128),
        width=data.get('width', 40),
        height=data.get('height', 30),
        map_data=data.get('map_data', '{}')
    )
    db.session.add(new_map)
    db.session.commit()
    return jsonify({'message': 'Map created', 'map': new_map.to_dict()}), 201

# 4) 맵 수정
@maps_bp.route('/maps/<string:map_key>', methods=['PUT'])
def update_map(map_key):
    m = Map.query.get_or_404(map_key)
    data = request.get_json() or {}

    m.display_name = data.get('display_name', m.display_name)
    m.json_file = data.get('json_file', m.json_file)
    m.tileset_file = data.get('tileset_file', m.tileset_file)
    m.tile_width = data.get('tile_width', m.tile_width)
    m.tile_height = data.get('tile_height', m.tile_height)
    m.width = data.get('width', m.width)
    m.height = data.get('height', m.height)
    if 'map_data' in data:
        m.map_data = data['map_data']

    # key(primary_key)는 변경 불가

    db.session.commit()
    return jsonify({'message': 'Map updated', 'map': m.to_dict()})

# 5) 맵 삭제
@maps_bp.route('/maps/<string:map_key>', methods=['DELETE'])
def delete_map(map_key):
    m = Map.query.get_or_404(map_key)
    db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'Map deleted'})
