# auth_admin.py — 관리자 인증 + admin_required 데코레이터
import os
from functools import wraps
from flask import Blueprint, request, jsonify, session

admin_auth_bp = Blueprint('admin_auth', __name__)

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")


def admin_required(f):
    """관리자 세션 인증 데코레이터 — 미인증 시 401 반환"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Admin authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


@admin_auth_bp.route('/admin_login', methods=['POST'])
def admin_login():
    """
    관리자 전용 로그인 (환경변수 ADMIN_USERNAME / ADMIN_PASSWORD 사용)
    세션에 is_admin=True 설정
    """
    if not ADMIN_PASSWORD:
        return jsonify({'error': 'Admin account not configured'}), 503

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({'error': 'Invalid admin credentials'}), 401

    session['is_admin'] = True
    return jsonify({
        'message': 'Admin login successful',
        'admin': True
    }), 200


@admin_auth_bp.route('/admin_logout', methods=['POST'])
def admin_logout():
    """관리자 로그아웃 — 세션 정리"""
    session.pop('is_admin', None)
    return jsonify({'message': 'Admin logged out'}), 200


@admin_auth_bp.route('/admin_session', methods=['GET'])
def admin_session():
    """현재 요청이 관리자 세션으로 인증되었는지 확인한다."""
    if not session.get('is_admin'):
        return jsonify({
            'authenticated': False,
            'admin': False,
        }), 401

    return jsonify({
        'authenticated': True,
        'admin': True,
        'username': ADMIN_USERNAME,
    }), 200
