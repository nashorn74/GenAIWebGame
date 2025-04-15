from flask import Blueprint, request, jsonify
from models import db, User

bp = Blueprint('api', __name__)

# 유저 생성 (Create) --> auth.py에서 처리
"""
@bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    bio = data.get('bio')

    if not username:
        return jsonify({'error': 'username is required'}), 400

    user = User(username=username, email=email, bio=bio)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created', 'user': user.to_dict()}), 201
"""
    
# 유저 목록 /users (Read - list)
@bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

# 유저 상세 /users/<id>
@bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

# 유저 수정 (Update)
@bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    user.bio = data.get('bio', user.bio)

    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()})

# 유저 삭제 (Delete)
@bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@bp.route('/users/<int:user_id>/ban', methods=['POST'])
def ban_user(user_id):
    """
    유저 정지: status='banned'
    """
    user = User.query.get_or_404(user_id)
    if user.status == 'banned':
        return jsonify({'error': 'User is already banned'}), 400

    user.status = 'banned'
    db.session.commit()
    return jsonify({'message': f'User {user.username} is now banned', 'status': user.status}), 200

@bp.route('/users/<int:user_id>/unban', methods=['POST'])
def unban_user(user_id):
    """
    유저 정지 해제: status='active'
    """
    user = User.query.get_or_404(user_id)
    if user.status != 'banned':
        return jsonify({'error': 'User is not banned'}), 400

    user.status = 'active'
    db.session.commit()
    return jsonify({'message': f'User {user.username} is now unbanned', 'status': user.status}), 200