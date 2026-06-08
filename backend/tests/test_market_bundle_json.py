"""Market bundle JSON serileştirme testleri."""

import json

from fastapi.testclient import TestClient


def test_market_bundles_json_serializable(client: TestClient, auth_headers):
    pf = client.get("/api/portfolio", headers=auth_headers).json()
    symbols = [p["symbol"] for p in pf.get("positions", [])] or ["AAPL", "NVDA"]
    r = client.post("/api/market/bundle", headers=auth_headers, json={"symbols": symbols})
    assert r.status_code == 200
    data = r.json()
    json.dumps(data)
    bundles = data.get("bundles", {})
    assert bundles
    for sym, bundle in bundles.items():
        assert "symbol" in bundle
        if not bundle.get("error"):
            assert bundle.get("daily")
