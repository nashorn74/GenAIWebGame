# auth_admin.py (또는 기존 auth.py 안에 추가 가능)
import os
from flask import Blueprint, request, jsonify

admin_auth_bp = Blueprint('admin_auth', __name__)

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

@admin_auth_bp.route('/admin_login', methods=['POST'])
def admin_login():
    """
    관리자 전용 로그인 (환경변수 ADMIN_USERNAME / ADMIN_PASSWORD 사용)
    """
    if not ADMIN_PASSWORD:
        return jsonify({'error': 'Admin account not configured'}), 503

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    # 검증
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({'error': 'Invalid admin credentials'}), 401

    # 관리자 인증 성공
    # 여기서 세션/토큰 발행 로직을 구현할 수 있음
    # 아래는 단순 메시지:
    return jsonify({
        'message': 'Admin login successful',
        'admin': True
    }), 200
