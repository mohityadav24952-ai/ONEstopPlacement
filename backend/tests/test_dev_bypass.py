import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def _settings(monkeypatch, **values):
    s = get_settings()
    for k, v in values.items():
        monkeypatch.setattr(s, k, v)


def test_production_refuses_to_start_with_bypass(monkeypatch):
    _settings(monkeypatch, dev_auth_bypass=True, environment="production")
    with pytest.raises(RuntimeError):
        create_app()


def test_non_development_refuses_to_start_with_bypass(monkeypatch):
    _settings(monkeypatch, dev_auth_bypass=True, environment="test")
    with pytest.raises(RuntimeError):
        create_app()


def test_dev_token_works_only_in_dev_with_flag(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)  # dev.db is created in the working directory
    from app.db import session

    session.get_engine.cache_clear()
    session.get_session_factory.cache_clear()
    _settings(monkeypatch, dev_auth_bypass=True, environment="development")
    try:
        client = TestClient(create_app(), raise_server_exceptions=False)
        ok = client.get("/api/v1/me", headers={"Authorization": "Bearer dev-token"})
        assert ok.status_code == 200 and ok.json()["email"] == "dev@example.com"
        bad = client.get("/api/v1/me", headers={"Authorization": "Bearer something-else"})
        assert bad.status_code in (401, 503)  # wrong token is never accepted
        assert client.get("/api/v1/me").status_code == 401
    finally:
        session.get_engine.cache_clear()
        session.get_session_factory.cache_clear()


def test_dev_token_rejected_when_flag_off(app):
    from fastapi.testclient import TestClient as TC

    app.dependency_overrides.clear()
    r = TC(app, raise_server_exceptions=False).get("/api/v1/me", headers={"Authorization": "Bearer dev-token"})
    assert r.status_code in (401, 503)
