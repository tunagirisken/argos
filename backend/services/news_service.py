"""Haber servisi — Firecrawl birincil, Exa yedek. Yalnızca başlık+URL+tarih."""

import logging
import os
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

import aiohttp

logger = logging.getLogger(__name__)

FIRECRAWL_URL = "https://api.firecrawl.dev/v1/search"
EXA_URL = "https://api.exa.ai/search"


def _normalize_item(title: str, url: str, published_at: str | None = None) -> dict:
    return {
        "title": (title or "").strip()[:200],
        "url": url.strip() if url else "",
        "published_at": published_at or datetime.utcnow().isoformat() + "Z",
    }


def _dedupe(items: list[dict]) -> list[dict]:
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    out = []
    for item in items:
        url_key = urlparse(item.get("url", "")).path.lower()
        title_key = item.get("title", "").lower()[:60]
        if url_key in seen_urls or title_key in seen_titles:
            continue
        seen_urls.add(url_key)
        seen_titles.add(title_key)
        out.append(item)
    return out


async def _fetch_firecrawl(symbol: str, limit: int = 8) -> list[dict]:
    """Firecrawl search API."""
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        return []

    query = (
        f"{symbol} stock news site:finance.yahoo.com OR site:reuters.com "
        f"OR site:bloomberg.com"
    )
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"query": query, "limit": limit}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            FIRECRAWL_URL,
            json=body,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise RuntimeError(f"Firecrawl {resp.status}: {text[:200]}")

            data = await resp.json()

    items = []
    results = data.get("data", data.get("results", []))
    if isinstance(results, dict):
        results = results.get("web", results.get("news", [])) or []

    for r in results if isinstance(results, list) else []:
        title = r.get("title") or r.get("metadata", {}).get("title", "")
        url = r.get("url") or r.get("link", "")
        pub = r.get("publishedDate") or r.get("published_at") or r.get("date")
        if title and url:
            items.append(_normalize_item(title, url, pub))

    return items


async def _fetch_exa(symbol: str, limit: int = 8) -> list[dict]:
    """Exa search API — yedek kaynak."""
    api_key = os.getenv("EXA_API_KEY")
    if not api_key:
        return []

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }
    body = {
        "query": f"{symbol} stock news",
        "numResults": limit,
        "useAutoprompt": True,
        "contents": {"text": False},
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            EXA_URL,
            json=body,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise RuntimeError(f"Exa {resp.status}: {text[:200]}")

            data = await resp.json()

    items = []
    for r in data.get("results", []):
        title = r.get("title", "")
        url = r.get("url", "")
        pub = r.get("publishedDate") or r.get("published_at")
        if title and url:
            items.append(_normalize_item(title, url, pub))

    return items


async def get_news_for_symbol(symbol: str) -> list[dict[str, Any]]:
    """Sembol haberleri — Firecrawl, başarısızsa Exa."""
    sym = symbol.upper()
    items: list[dict] = []

    try:
        items = await _fetch_firecrawl(sym)
        logger.info("Firecrawl %s: %d haber", sym, len(items))
    except Exception as e:
        logger.warning("Firecrawl başarısız %s: %s", sym, e)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except ImportError:
            pass

    if not items:
        try:
            items = await _fetch_exa(sym)
            logger.info("Exa yedek %s: %d haber", sym, len(items))
        except Exception as e:
            logger.error("Exa da başarısız %s: %s", sym, e)
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except ImportError:
                pass

    return _dedupe(items)[:10]


async def get_portfolio_news(symbols: list[str]) -> dict[str, list[dict]]:
    """Portföydeki tüm semboller için haber."""
    result = {}
    for sym in symbols:
        result[sym.upper()] = await get_news_for_symbol(sym)
    return result
