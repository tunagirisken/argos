"""Derin analiz pipeline ve watchlist testleri."""

from backend.services import analysis_pipeline
from backend.utils.market_hours import now_istanbul


def test_fundamental_agent_score_baseline():
    # Mock yok — boş info ile graceful
    class FakeTicker:
        info = {}

    import backend.services.agents.fundamental_agent as fa

    orig = fa.yf.Ticker
    fa.yf.Ticker = lambda s: FakeTicker()
    try:
        r = fa.analyze_sync("TEST")
    finally:
        fa.yf.Ticker = orig
    assert 0 <= r["score"] <= 100
    assert "summary" in r


def test_cache_valid_same_day():
    today = now_istanbul().isoformat(timespec="seconds")
    assert analysis_pipeline._cache_valid({"generated_at": today}) is True


def test_read_write_cache(tmp_path, monkeypatch):
    cache_dir = tmp_path / "analysis_cache"
    monkeypatch.setattr(analysis_pipeline, "CACHE_DIR", cache_dir)
    payload = {
        "symbol": "AAPL",
        "composite_score": 65.0,
        "generated_at": now_istanbul().isoformat(timespec="seconds"),
    }
    analysis_pipeline.write_cached_analysis("AAPL", payload)
    got = analysis_pipeline.read_cached_analysis("AAPL")
    assert got is not None
    assert got["symbol"] == "AAPL"


def test_run_sentiment_agent():
    news = [{"title": "NVIDIA beats earnings record growth"}]
    r = analysis_pipeline._run_sentiment_agent(news)
    assert r["score"] > 50
    assert r["positive_count"] >= 1


def test_watchlist_crud(client, auth_headers, tmp_path, monkeypatch):
    wl = tmp_path / "watchlist.json"
    monkeypatch.setattr("backend.api.routes.watchlist.WATCHLIST_FILE", wl)

    r = client.get("/api/watchlist", headers=auth_headers)
    assert r.status_code == 200

    r = client.post(
        "/api/watchlist",
        headers=auth_headers,
        json={"symbol": "AAPL", "note": "izle"},
    )
    assert r.status_code == 200

    r = client.post(
        "/api/watchlist",
        headers=auth_headers,
        json={"symbol": "AAPL"},
    )
    assert r.status_code == 409

    r = client.delete("/api/watchlist/AAPL", headers=auth_headers)
    assert r.status_code == 200


def test_deep_cached_404(client, auth_headers, tmp_path, monkeypatch):
    cache_dir = tmp_path / "analysis_cache"
    monkeypatch.setattr(analysis_pipeline, "CACHE_DIR", cache_dir)
    r = client.get("/api/analysis/deep/ZZZZ/cached", headers=auth_headers)
    assert r.status_code == 404
