"""Dokümantasyon API testleri."""


def test_telegram_docs(client, auth_headers):
    r = client.get("/api/docs/telegram", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "commands" in data
    assert "markdown" in data
    assert "/durum" in data["markdown"]


def test_targets_docs(client, auth_headers):
    r = client.get("/api/docs/targets", headers=auth_headers)
    assert r.status_code == 200
    assert "yfinance" in r.json()["markdown"].lower()
