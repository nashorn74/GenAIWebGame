# auth_admin.py (또는 기존 auth.py 안에 추가 가능)
from flask import Blueprint, request, jsonify

admin_auth_bp = Blueprint('admin_auth', __name__)

# 하드코딩된 관리자 계정 정보 (실제로는 환경변수 등을 권장)
ADMIN_USERNAME = "superadmin"
ADMIN_PASSWORD = "P@ssw0rd123"

@admin_auth_bp.route('/admin_login', methods=['POST'])
def admin_login():
    """
    관리자 전용 로그인 (DB X, 하드코딩 계정)
    요청 예:
    {
      "username": "superadmin",
      "password": "P@ssw0rd123"
    }
    """
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
