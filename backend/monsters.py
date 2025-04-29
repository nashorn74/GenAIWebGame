# monsters.py
from flask import Blueprint, request, jsonify
from models import Monster

monsters_bp = Blueprint('monsters', __name__)

@monsters_bp.route('/monsters', methods=['GET'])
def list_monsters():
    q = Monster.query
    if mk := request.args.get('map_key'):
        q = q.filter_by(map_key=mk)
    return jsonify([m.to_dict() for m in q.all()])
