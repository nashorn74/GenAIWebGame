import os
import pytest


def test_admin_login_success(client, monkeypatch):
    monkeypatch.setattr('auth_admin.ADMIN_USERNAME', 'testadmin')
    monkeypatch.setattr('auth_admin.ADMIN_PASSWORD', 'testpass')
    resp = client.post('/auth/admin_login', json={
        'username': 'testadmin',
        'password': 'testpass',
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['admin'] is True
    assert 'successful' in data['message'].lower()


def test_admin_login_invalid_credentials(client, monkeypatch):
    monkeypatch.setattr('auth_admin.ADMIN_USERNAME', 'testadmin')
    monkeypatch.setattr('auth_admin.ADMIN_PASSWORD', 'testpass')
    resp = client.post('/auth/admin_login', json={
        'username': 'testadmin',
        'password': 'wrongpass',
    })
    assert resp.status_code == 401
    assert 'Invalid' in resp.get_json()['error']


def test_admin_login_unconfigured(client, monkeypatch):
    monkeypatch.setattr('auth_admin.ADMIN_PASSWORD', None)
    resp = client.post('/auth/admin_login', json={
        'username': 'admin',
        'password': 'anything',
    })
    assert resp.status_code == 503
    assert 'not configured' in resp.get_json()['error'].lower()


def test_admin_session_reports_authenticated_client(admin_client, monkeypatch):
    monkeypatch.setattr('auth_admin.ADMIN_USERNAME', 'testadmin')
    resp = admin_client.get('/auth/admin_session')

    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {
        'authenticated': True,
        'admin': True,
        'username': 'testadmin',
    }


def test_admin_session_reports_unauthenticated_client(client):
    resp = client.get('/auth/admin_session')

    assert resp.status_code == 401
    data = resp.get_json()
    assert data == {
        'authenticated': False,
        'admin': False,
    }


def test_admin_logout_clears_session(admin_client):
    logout_resp = admin_client.post('/auth/admin_logout')
    session_resp = admin_client.get('/auth/admin_session')

    assert logout_resp.status_code == 200
    assert session_resp.status_code == 401
