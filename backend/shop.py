# shop.py
from flask import Blueprint, request, jsonify
from models import db, NPC, Character, Item, CharacterItem

shop_bp = Blueprint('shop', __name__)

@shop_bp.route('/shops/<int:npc_id>/buy', methods=['POST'])
def buy_item(npc_id):
    """
    플레이어가 npc_id(=Garrett Leaf)에게서 아이템 구매
    요청 JSON 예:
    {
      "character_id": 1,
      "item_id": 10,
      "quantity": 2
    }
    """
    data = request.get_json() or {}
    char_id = data.get('character_id')
    item_id = data.get('item_id')
    qty = data.get('quantity', 1)

    # 1) NPC 확인
    npc = NPC.query.get_or_404(npc_id)
    # 예: npc.name="Garrett Leaf", npc.job="Traveling Merchant", npc.map_key="city2"
    if npc.job != "Traveling Merchant" or npc.map_key != "city2":
        return jsonify({'error': 'This NPC is not a traveling merchant in Greenfield'}), 400

    # 2) 캐릭터 / 아이템 확인
    char = Character.query.get_or_404(char_id)
    item = Item.query.get_or_404(item_id)

    # 구매 가능한 아이템인지(= buy_price>0)
    if item.buy_price <= 0:
        return jsonify({'error': f'Item {item.name} cannot be purchased'}), 400

    # 3) 골드 체크
    total_cost = item.buy_price * qty
    if char.gold < total_cost:
        return jsonify({'error': 'Not enough gold'}), 400

    # 4) 인벤토리 증가
    char.gold -= total_cost
    # 캐릭터가 이미 가진 item이면 수량 증가
    char_item = CharacterItem.query.filter_by(character_id=char.id, item_id=item.id).first()
    if not char_item:
        char_item = CharacterItem(character_id=char.id, item_id=item.id, quantity=0)
        db.session.add(char_item)
    char_item.quantity += qty

    db.session.commit()

    return jsonify({
        'message': f'Purchased {qty} x {item.name}',
        'character_gold': char.gold
    })


@shop_bp.route('/shops/<int:npc_id>/sell', methods=['POST'])
def sell_item(npc_id):
    """
    플레이어가 npc_id(=Garrett Leaf)에게 아이템 판매
    요청 JSON 예:
    {
      "character_id": 1,
      "item_id": 5,
      "quantity": 3
    }
    """
    data = request.get_json() or {}
    char_id = data.get('character_id')
    item_id = data.get('item_id')
    qty = data.get('quantity', 1)

    # 1) NPC 확인
    npc = NPC.query.get_or_404(npc_id)
    if npc.job != "Traveling Merchant" or npc.map_key != "city2":
        return jsonify({'error': 'This NPC is not a traveling merchant in Greenfield'}), 400

    # 2) 캐릭터 / 아이템
    char = Character.query.get_or_404(char_id)
    item = Item.query.get_or_404(item_id)

    # 판매 가능한 아이템? (drop 아이템이거나, sell_price>0 인 경우)
    if item.sell_price <= 0:
        return jsonify({'error': f'Item {item.name} cannot be sold'}), 400

    # 3) 캐릭터 인벤토리에서 수량 체크
    char_item = CharacterItem.query.filter_by(character_id=char.id, item_id=item.id).first()
    if not char_item or char_item.quantity < qty:
        return jsonify({'error': 'Not enough items to sell'}), 400

    # 4) 판매 처리
    total_gain = item.sell_price * qty
    char.gold += total_gain
    char_item.quantity -= qty
    if char_item.quantity <= 0:
        db.session.delete(char_item)

    db.session.commit()

    return jsonify({
        'message': f'Sold {qty} x {item.name}',
        'character_gold': char.gold
    })
