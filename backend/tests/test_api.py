"""Temel API entegrasyon testleri."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "argos-backend"}


def test_setup_status():
    r = client.get("/api/setup/status")
    assert r.status_code == 200
    data = r.json()
    assert "setup_complete" in data
    assert "has_env" in data
    assert "has_portfolio" in data


def test_portfolio_list():
    r = client.get("/api/portfolio")
    assert r.status_code == 200
    data = r.json()
    assert "positions" in data


def test_alerts_list():
    r = client.get("/api/alerts")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
