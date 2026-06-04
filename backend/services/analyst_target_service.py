"""Analist hedef fiyat — yfinance konsensüsü + Firecrawl web doğrulama."""

import asyncio
import logging
import os
import re
from statistics import median
from typing import Any

import yfinance as yf

from backend.utils.json_store import read_json, write_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)

PRICE_RE = re.compile(r"\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)")


def _parse_dollar(text: str) -> float | None:
    for m in PRICE_RE.finditer(text):
        raw = m.group(1).replace(",", "")
        try:
            val = float(raw)
            if 1 < val < 50_000:
                return round(val, 2)
        except ValueError:
            continue
    return None


def _yf_analyst_sync(symbol: str) -> dict[str, Any]:
    """Yahoo Finance analist konsensüsü."""
    sym = symbol.upper()
    ticker = yf.Ticker(sym)
    info = ticker.info or {}
    mean = info.get("targetMeanPrice")
    high = info.get("targetHighPrice")
    low = info.get("targetLowPrice")
    count = int(info.get("numberOfAnalystOpinions") or 0)
    rec = str(info.get("recommendationKey") or "")
    current = info.get("currentPrice") or info.get("regularMarketPrice")

    def _f(v: Any) -> float | None:
        if v is None:
            return None
        try:
            return round(float(v), 2)
        except (TypeError, ValueError):
            return None

    return {
        "symbol": sym,
        "source": "yfinance",
        "current_price": _f(current),
        "target_mean": _f(mean),
        "target_high": _f(high),
        "target_low": _f(low),
        "analyst_count": count,
        "recommendation": rec,
    }


async def _web_consensus(symbol: str) -> dict[str, Any] | None:
    """Firecrawl ile analist hedef sayfalarını tara."""
    api_key = (os.getenv("FIRECRAWL_API_KEY") or "").strip()
    if not api_key:
        return None

    import aiohttp

    sym = symbol.upper()
    query = (
        f"{sym} stock average analyst price target consensus "
        f"site:finance.yahoo.com OR site:marketwatch.com OR site:tipranks.com"
    )
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"query": query, "limit": 6}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.firecrawl.dev/v1/search",
                json=body,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=35),
            ) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
    except Exception as e:
        logger.warning("Firecrawl hedef tarama %s: %s", sym, e)
        return None

    results = data.get("data", data.get("results", []))
    if isinstance(results, dict):
        results = results.get("web", []) or []

    prices: list[float] = []
    snippets: list[str] = []
    for r in results if isinstance(results, list) else []:
        blob = " ".join(
            str(r.get(k, ""))
            for k in ("title", "description", "markdown", "content", "snippet")
        )
        low = blob.lower()
        if not any(
            w in low
            for w in ("target", "consensus", "analyst", "hedef", "average", "price target")
        ):
            continue
        val = _parse_dollar(blob)
        if val:
            prices.append(val)
        if r.get("url"):
            snippets.append(str(r.get("url"))[:80])

    if not prices:
        return None

    web_mean = round(median(prices), 2)
    return {
        "source": "firecrawl",
        "target_mean": web_mean,
        "samples": len(prices),
        "urls": snippets[:3],
    }


def _confidence(yf: dict, web: dict | None) -> str:
    count = int(yf.get("analyst_count") or 0)
    yf_mean = yf.get("target_mean")
    web_mean = (web or {}).get("target_mean")

    if yf_mean and count >= 5 and web_mean:
        diff = abs(yf_mean - web_mean) / yf_mean if yf_mean else 1
        if diff <= 0.08:
            return "yüksek"
    if yf_mean and count >= 3:
        return "orta"
    if yf_mean or web_mean:
        return "orta"
    return "düşük"


def _pick_target(yf: dict, web: dict | None) -> float | None:
    yf_mean = yf.get("target_mean")
    web_mean = (web or {}).get("target_mean")
    count = int(yf.get("analyst_count") or 0)

    if yf_mean and count >= 2:
        if web_mean and abs(yf_mean - web_mean) / yf_mean <= 0.15:
            return round((yf_mean + web_mean) / 2, 2)
        return yf_mean
    if web_mean:
        return web_mean
    if yf_mean:
        return yf_mean
    high = yf.get("target_high")
    if high:
        return high
    return None


async def get_analyst_target(symbol: str) -> dict[str, Any]:
    """Tek sembol için analist hedef özeti."""
    yf_data = await asyncio.to_thread(_yf_analyst_sync, symbol)
    web = await _web_consensus(symbol)
    recommended = _pick_target(yf_data, web)
    conf = _confidence(yf_data, web)

    return {
        **yf_data,
        "web": web,
        "recommended_target": recommended,
        "confidence": conf,
    }


def _format_target_line(info: dict) -> str:
    sym = info.get("symbol", "?")
    rec = info.get("recommended_target")
    conf = info.get("confidence", "?")
    cnt = info.get("analyst_count", 0)
    if rec is None:
        return f"• {sym}: hedef bulunamadı"
    return f"• {sym}: ${rec:.2f} ({conf}, {cnt} analist)"


async def format_target_message(symbol: str | None = None) -> str:
    """Telegram için hedef metni."""
    if symbol:
        info = await get_analyst_target(symbol)
        lines = [
            f"🎯 {info['symbol']} analist hedefi",
            _format_target_line(info),
        ]
        if info.get("target_high") and info.get("target_low"):
            lines.append(
                f"  Aralık: ${info['target_low']:.2f} – ${info['target_high']:.2f}"
            )
        if info.get("recommendation"):
            lines.append(f"  Öneri: {info['recommendation']}")
        if info.get("web"):
            lines.append(f"  Web tarama: ${info['web']['target_mean']:.2f} ({info['web']['samples']} örnek)")
        return "\n".join(lines)

    portfolio = read_json(PORTFOLIO_FILE, default={})
    positions = portfolio.get("positions", [])
    if not positions:
        return "Portföy boş."

    lines = ["🎯 Portföy hedef özeti", ""]
    for pos in positions:
        sym = pos["symbol"]
        stored = pos.get("target")
        info = await get_analyst_target(sym)
        line = _format_target_line(info)
        if stored:
            line += f" | kayıtlı: ${float(stored):.2f}"
        lines.append(line)
    return "\n".join(lines)


async def sync_portfolio_targets(apply: bool = True) -> list[dict[str, Any]]:
    """Portföydeki tüm pozisyonlar için hedef güncelle."""
    data = read_json(PORTFOLIO_FILE, default={"positions": []})
    positions = data.get("positions", [])
    results: list[dict[str, Any]] = []

    for pos in positions:
        sym = pos["symbol"]
        info = await get_analyst_target(sym)
        old = pos.get("target")
        new = info.get("recommended_target")
        entry = {
            "symbol": sym,
            "old_target": old,
            "new_target": new,
            "confidence": info.get("confidence"),
            "analyst_count": info.get("analyst_count"),
            "applied": False,
        }
        if apply and new is not None:
            pos["target"] = new
            pos["target_source"] = "analyst_consensus"
            pos["target_updated"] = info.get("confidence")
            entry["applied"] = True
        results.append(entry)

    if apply:
        write_json(PORTFOLIO_FILE, data)
    return results
