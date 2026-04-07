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
