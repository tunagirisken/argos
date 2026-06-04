"""Temel API entegrasyon testleri."""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "argos-backend"}


def test_setup_status_requires_auth(client):
    r = client.get("/api/setup/status")
    assert r.status_code == 401


def test_setup_status(client, auth_headers):
    r = client.get("/api/setup/status", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "setup_complete" in data
    assert "has_env" in data
    assert "has_portfolio" in data


def test_portfolio_list(client, auth_headers):
    r = client.get("/api/portfolio", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "positions" in data


def test_alerts_list(client, auth_headers):
    r = client.get("/api/alerts", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_market_hours(client, auth_headers):
    r = client.get("/api/market/hours", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "open" in data
    assert "label" in data
    assert "local_time" in data
