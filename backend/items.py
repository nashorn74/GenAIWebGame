from flask import Blueprint, request, jsonify
from models import db, Item, Character, CharacterItem

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


# ────────────────────────────────────────────────
# 소비 아이템 사용 (물약 등)
# ────────────────────────────────────────────────
@items_bp.route('/items/use', methods=['POST'])
def use_item():
    """
    POST /api/items/use
    Body: { character_id, item_id, quantity? }
    포션 등 소비 아이템을 사용하여 캐릭터 HP/MP 를 회복한다.
    """
    data = request.get_json() or {}
    char_id = data.get('character_id')
    item_id = data.get('item_id')
    qty     = data.get('quantity', 1)

    if not char_id or not item_id:
        return jsonify({'error': 'character_id 와 item_id 가 필요합니다.'}), 400
    if qty < 1:
        return jsonify({'error': '수량은 1 이상이어야 합니다.'}), 400

    char: Character = db.session.get(Character, char_id)
    if not char:
        return jsonify({'error': '캐릭터를 찾을 수 없습니다.'}), 404

    item: Item = db.session.get(Item, item_id)
    if not item:
        return jsonify({'error': '아이템을 찾을 수 없습니다.'}), 404

    if item.category != 'potion':
        return jsonify({'error': '소비할 수 없는 아이템입니다.'}), 400

    # 인벤토리 보유 확인
    ci: CharacterItem | None = (
        CharacterItem.query
        .filter_by(character_id=char_id, item_id=item_id)
        .first()
    )
    if not ci or ci.quantity < qty:
        return jsonify({'error': '보유 수량이 부족합니다.'}), 400

    # 이미 HP 가 최대치이면 사용 불가
    if char.hp >= char.max_hp:
        return jsonify({'error': 'HP가 이미 최대입니다.'}), 400

    # HP 회복 적용
    healed = 0
    for _ in range(qty):
        if char.hp >= char.max_hp:
            break
        before = char.hp
        char.hp = min(char.hp + item.effect_value, char.max_hp)
        healed += char.hp - before
        ci.quantity -= 1

    # 수량 0이면 레코드 삭제
    if ci.quantity <= 0:
        db.session.delete(ci)

    db.session.commit()

    return jsonify({
        'message': f'{item.name} 사용! HP +{healed}',
        'healed': healed,
        'hp': char.hp,
        'max_hp': char.max_hp,
        'remaining_qty': max(0, ci.quantity) if ci in db.session else 0,
    })
