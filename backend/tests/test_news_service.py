"""Haber servisi birim testleri."""

import asyncio

from backend.services import news_service


def test_normalize_item_sentiment():
    item = news_service._normalize_item(
        "NVIDIA beats earnings expectations",
        "https://example.com/a",
        "2026-06-08T10:00:00Z",
        "google",
        "2026-06-08T10:05:00Z",
    )
    assert item["sentiment"] == "pos"
    assert item["provider"] == "google"


def test_dedupe_and_sort():
    a = news_service._normalize_item("A", "https://x.com/1", "2026-06-08T09:00:00Z", "google", "2026-06-08T09:00:00Z")
    b = news_service._normalize_item("A", "https://x.com/2", "2026-06-08T10:00:00Z", "yfinance", "2026-06-08T10:00:00Z")
    c = news_service._normalize_item("B", "https://x.com/3", "2026-06-08T11:00:00Z", "google", "2026-06-08T11:00:00Z")
    out = news_service._sort_items(news_service._dedupe([a, b, c]))
    assert len(out) == 2
    assert out[0]["title"] == "B"


def test_get_news_google_rss(monkeypatch):
    """API anahtarı olmadan Google RSS ile haber dönmeli."""

    async def fake_collect(symbol: str):
        return [
            news_service._normalize_item(
                f"{symbol} rises on strong demand",
                "https://news.google.com/articles/abc",
                "2026-06-08T12:00:00Z",
                "google",
                "2026-06-08T12:01:00Z",
            )
        ]

    monkeypatch.setattr(news_service, "_collect_from_sources", fake_collect)
    news_service._CACHE.clear()
    items = asyncio.run(news_service.get_news_for_symbol("NVDA", use_cache=False))
    assert len(items) == 1
    assert items[0]["provider"] == "google"
    assert "fetched_at" in items[0]
