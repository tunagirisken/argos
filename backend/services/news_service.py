"""Haber servisi — çoklu kaynak: Google RSS + yfinance (ücretsiz), Firecrawl + Exa (API anahtarı varsa)."""

import asyncio
import logging
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import aiohttp
import yfinance as yf

from backend.services.trade_signal_service import NEGATIVE_WORDS, POSITIVE_WORDS

logger = logging.getLogger(__name__)

FIRECRAWL_URL = "https://api.firecrawl.dev/v1/search"
EXA_URL = "https://api.exa.ai/search"
GOOGLE_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

# Sembol başına kısa önbellek (dakika)
_CACHE: dict[str, tuple[datetime, list[dict]]] = {}
_CACHE_TTL_SEC = 300


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _to_iso_utc(value: Any) -> str | None:
    """Çeşitli tarih formatlarını UTC ISO'ya çevir."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        except (OSError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return _to_iso_utc(int(text))
    try:
        if text.endswith("Z"):
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        elif "+" in text[10:] or text.endswith("+00:00"):
            dt = datetime.fromisoformat(text)
        else:
            dt = parsedate_to_datetime(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    except (ValueError, TypeError):
        return None


def _sentiment(title: str) -> str:
    low = (title or "").lower()
    if any(w in low for w in NEGATIVE_WORDS):
        return "neg"
    if any(w in low for w in POSITIVE_WORDS):
        return "pos"
    return "neu"


def _normalize_item(
    title: str,
    url: str,
    published_at: str | None,
    source: str,
    fetched_at: str,
) -> dict[str, Any]:
    pub = _to_iso_utc(published_at) or fetched_at
    clean_title = (title or "").strip()
    # Google RSS: "Başlık - Kaynak" ayrıştır
    display_source = source
    if source == "google" and " - " in clean_title:
        parts = clean_title.rsplit(" - ", 1)
        if len(parts) == 2 and len(parts[1]) < 40:
            clean_title = parts[0].strip()
            display_source = parts[1].strip()
    return {
        "title": clean_title[:200],
        "url": (url or "").strip(),
        "published_at": pub,
        "fetched_at": fetched_at,
        "source": display_source,
        "provider": source,
        "sentiment": _sentiment(clean_title),
    }


def _dedupe(items: list[dict]) -> list[dict]:
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    out: list[dict] = []
    for item in items:
        url_key = urlparse(item.get("url", "")).path.lower()
        title_key = item.get("title", "").lower()[:60]
        if not title_key or not item.get("url"):
            continue
        if url_key in seen_urls or title_key in seen_titles:
            continue
        seen_urls.add(url_key)
        seen_titles.add(title_key)
        out.append(item)
    return out


def _sort_items(items: list[dict]) -> list[dict]:
    def key(it: dict) -> str:
        return it.get("published_at") or it.get("fetched_at") or ""

    return sorted(items, key=key, reverse=True)


def _fetch_google_rss_sync(symbol: str, limit: int = 12) -> list[dict]:
    """Google News RSS — API anahtarı gerektirmez."""
    sym = symbol.upper()
    fetched_at = _utc_now_iso()
    query = f"{sym}+stock"
    url = GOOGLE_RSS.format(query=query.replace(" ", "+"))
    req = Request(url, headers={"User-Agent": "ARGOS/1.0"})
    with urlopen(req, timeout=20) as resp:
        root = ET.fromstring(resp.read())

    items: list[dict] = []
    for node in root.findall(".//item")[:limit]:
        title = node.findtext("title") or ""
        link = node.findtext("link") or ""
        pub = node.findtext("pubDate")
        if title and link:
            items.append(_normalize_item(title, link, pub, "google", fetched_at))
    return items


def _fetch_yfinance_sync(symbol: str, limit: int = 10) -> list[dict]:
    """Yahoo Finance haber akışı."""
    sym = symbol.upper()
    fetched_at = _utc_now_iso()
    raw = yf.Ticker(sym).news or []
    items: list[dict] = []
    for entry in raw[:limit]:
        content = entry.get("content") if isinstance(entry, dict) else {}
        if not isinstance(content, dict):
            content = entry if isinstance(entry, dict) else {}
        title = content.get("title") or entry.get("title", "")
        url = (
            content.get("canonicalUrl")
            or content.get("clickThroughUrl")
            or content.get("previewUrl")
            or entry.get("link", "")
        )
        pub = content.get("pubDate") or content.get("displayTime") or entry.get("providerPublishTime")
        if title and url:
            items.append(_normalize_item(title, url, pub, "yfinance", fetched_at))
    return items


async def _fetch_firecrawl(symbol: str, limit: int = 8) -> list[dict]:
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        return []

    sym = symbol.upper()
    fetched_at = _utc_now_iso()
    query = (
        f"{sym} stock news site:finance.yahoo.com OR site:reuters.com "
        f"OR site:bloomberg.com OR site:cnbc.com"
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

    items: list[dict] = []
    results = data.get("data", data.get("results", []))
    if isinstance(results, dict):
        results = results.get("web", results.get("news", [])) or []

    for r in results if isinstance(results, list) else []:
        title = r.get("title") or r.get("metadata", {}).get("title", "")
        url = r.get("url") or r.get("link", "")
        pub = r.get("publishedDate") or r.get("published_at") or r.get("date")
        if title and url:
            items.append(_normalize_item(title, url, pub, "firecrawl", fetched_at))
    return items


async def _fetch_exa(symbol: str, limit: int = 8) -> list[dict]:
    api_key = os.getenv("EXA_API_KEY")
    if not api_key:
        return []

    sym = symbol.upper()
    fetched_at = _utc_now_iso()
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    body = {
        "query": f"{sym} stock news",
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

    items: list[dict] = []
    for r in data.get("results", []):
        title = r.get("title", "")
        url = r.get("url", "")
        pub = r.get("publishedDate") or r.get("published_at")
        if title and url:
            items.append(_normalize_item(title, url, pub, "exa", fetched_at))
    return items


async def _collect_from_sources(symbol: str) -> list[dict]:
    """Tüm kaynaklardan paralel topla."""
    sym = symbol.upper()
    google_task = asyncio.to_thread(_fetch_google_rss_sync, sym)
    yf_task = asyncio.to_thread(_fetch_yfinance_sync, sym)
    fc_task = _fetch_firecrawl(sym)
    exa_task = _fetch_exa(sym)

    results = await asyncio.gather(google_task, yf_task, fc_task, exa_task, return_exceptions=True)
    merged: list[dict] = []
    labels = ("google", "yfinance", "firecrawl", "exa")
    for label, res in zip(labels, results):
        if isinstance(res, Exception):
            logger.warning("Haber kaynağı %s %s: %s", label, sym, res)
            continue
        merged.extend(res)
        if res:
            logger.info("Haber %s/%s: %d", label, sym, len(res))
    return merged


async def get_news_for_symbol(symbol: str, *, use_cache: bool = True) -> list[dict[str, Any]]:
    """Sembol haberleri — çoklu kaynak birleşimi."""
    sym = symbol.upper()
    now = datetime.now(timezone.utc)
    if use_cache and sym in _CACHE:
        ts, cached = _CACHE[sym]
        if (now - ts).total_seconds() < _CACHE_TTL_SEC:
            return list(cached)

    items = await _collect_from_sources(sym)
    out = _sort_items(_dedupe(items))[:12]
    _CACHE[sym] = (now, out)
    return out


async def get_portfolio_news(symbols: list[str]) -> dict[str, list[dict]]:
    """Portföydeki tüm semboller için haber."""
    result: dict[str, list[dict]] = {}
    for sym in symbols:
        result[sym.upper()] = await get_news_for_symbol(sym)
    return result
