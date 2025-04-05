from flask import Blueprint, request, jsonify
from models import db, Item

items_bp = Blueprint('items', __name__)

@items_bp.route('/items', methods=['GET'])
def list_items():
    """
    예: GET /api/items?category=drop
    """
    query = Item.query
    category = request.args.get('category')
    if category:
        query = query.filter_by(category=category)

    items = query.all()
    return jsonify([i.to_dict() for i in items])

@items_bp.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@items_bp.route('/items', methods=['POST'])
def create_item():
    data = request.get_json() or {}
    name = data.get('name')
    category = data.get('category', 'drop')
    if not name:
        return jsonify({'error': 'name is required'}), 400

    item = Item(
        name=name,
        category=category,
        description=data.get('description', ''),
        buy_price=data.get('buy_price', 0),
        sell_price=data.get('sell_price', 0),
        attack_power=data.get('attack_power', 0),
        defense_power=data.get('defense_power', 0),
        effect_value=data.get('effect_value', 0)
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Item created', 'item': item.to_dict()}), 201

@items_bp.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.get_json() or {}

    item.name = data.get('name', item.name)
    item.category = data.get('category', item.category)
    item.description = data.get('description', item.description)
    item.buy_price = data.get('buy_price', item.buy_price)
    item.sell_price = data.get('sell_price', item.sell_price)
    item.attack_power = data.get('attack_power', item.attack_power)
    item.defense_power = data.get('defense_power', item.defense_power)
    item.effect_value = data.get('effect_value', item.effect_value)

    db.session.commit()
    return jsonify({'message': 'Item updated', 'item': item.to_dict()})

@items_bp.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted'})
