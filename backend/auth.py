# auth.py
from flask import Blueprint, request, jsonify
from models import db, User
import re

auth_bp = Blueprint('auth', __name__)

# 아이디 형식(소문자+숫자 4~12자) 예시 정규식
USERNAME_REGEX = re.compile('^[a-z0-9]{4,12}$')
# 비밀번호 형식(영문+숫자 포함, 8~16자) 예시 정규식
PASSWORD_REGEX = re.compile('^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$')

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    회원가입:
    요청 JSON 예시:
    {
      "username": "test123",
      "password": "abc12345",
      "password_confirm": "abc12345",
      "email": "user@example.com"
    }
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')
    email = data.get('email', '').strip() or None

    # --- 간단한 검증 로직 예시 ---
    # 1) 아이디 형식 체크
    if not USERNAME_REGEX.match(username):
        return jsonify({'error': 'Invalid username format (4~12 lowercase+digits)'}), 400

    # 2) 비밀번호 형식 체크
    if not PASSWORD_REGEX.match(password):
        return jsonify({'error': 'Invalid password format (8~16, must include letters & digits)'}), 400

    # 3) 비밀번호 재확인
    if password != password_confirm:
        return jsonify({'error': 'Passwords do not match'}), 400

    # 4) 아이디 중복 체크
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    # (이메일 중복 체크도 할 수 있음)
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already in use'}), 400

    # --- 가입 처리 ---
    user = User(username=username, email=email)
    user.set_password(password)  # 해시 저장
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    로그인:
    요청 JSON 예시:
    {
      "username": "test123",
      "password": "abc12345"
    }
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    # 비밀번호 검사
    if not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    # 여기서 세션/토큰 발행 로직을 구현할 수 있음
    # 예: flask_login, JWT 등
    # 아래는 단순히 메시지만 리턴하는 예시:
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict()
    }), 200
