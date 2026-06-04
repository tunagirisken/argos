"""Piyasa verisi paketi — yfinance tabanlı gerçek OHLCV, indikatörler, sinyaller."""

import asyncio
import logging
from typing import Any

from backend.services import chart_service, price_service, technical_service

logger = logging.getLogger(__name__)


def _signal_components(ind: dict[str, Any], change_pct: float = 0) -> list[dict[str, Any]]:
    """UI sinyal satırları — gerçek indikatörlerden."""
    rsi = ind.get("rsi")
    macd_hist = ind.get("macd_histogram")
    price = ind.get("price") or 0
    bb_lower = ind.get("bb_lower")
    bb_upper = ind.get("bb_upper")
    ema50 = ind.get("ema50")
    vol_ratio = ind.get("volume_ratio")

    rsi_val = 0
    if rsi is not None:
        if rsi <= 35:
            rsi_val = 1
        elif rsi >= 68:
            rsi_val = -1

    macd_val = 0
    if macd_hist is not None:
        macd_val = 1 if macd_hist > 0 else -1 if macd_hist < 0 else 0

    bb_val = 0
    if bb_lower and bb_upper and price:
        if price <= bb_lower * 1.02:
            bb_val = 1
        elif price >= bb_upper * 0.98:
            bb_val = -1

    ema_val = 0
    if ema50 and price:
        ema_val = 1 if price > ema50 else -1

    if vol_ratio is not None:
        if vol_ratio >= 1.2:
            vol_val = 1
            vol_note = "hacim yüksek"
        elif vol_ratio <= 0.8:
            vol_val = -1
            vol_note = "hacim düşük"
        else:
            vol_val = 1 if change_pct > 0 else -1 if change_pct < 0 else 0
            vol_note = "normal hacim"
    else:
        vol_val = 1 if change_pct > 0 else -1 if change_pct < 0 else 0
        vol_note = "alış baskın" if vol_val > 0 else "satış baskın" if vol_val < 0 else "nötr"

    return [
        {"key": "RSI", "val": rsi_val, "note": f"{rsi:.0f}" if rsi is not None else "—"},
        {
            "key": "MACD",
            "val": macd_val,
            "note": "pozitif" if macd_val > 0 else "negatif" if macd_val < 0 else "nötr",
        },
        {
            "key": "BB",
            "val": bb_val,
            "note": "alt bant" if bb_val > 0 else "üst bant" if bb_val < 0 else "orta",
        },
        {"key": "EMA", "val": ema_val, "note": "trend ↑" if ema_val > 0 else "trend ↓" if ema_val < 0 else "yatay"},
        {"key": "Hacim", "val": vol_val, "note": vol_note},
    ]


async def get_market_bundle(symbol: str) -> dict[str, Any]:
    """Tek sembol: grafik + fiyat + indikatör + sinyal."""
    sym = symbol.upper()
    chart, ind, sig, price = await asyncio.gather(
        chart_service.get_chart_series(sym),
        technical_service.compute_indicators(sym),
        technical_service.generate_signal(sym),
        price_service.get_price(sym),
    )
    change_pct = float(price.get("change_pct") or 0)
    components = _signal_components(ind, change_pct)
    return {
        "symbol": sym,
        "price": price["price"],
        "change_pct": change_pct,
        "currency": price.get("currency", "USD"),
        "daily": chart["daily"],
        "dailyVol": chart["dailyVol"],
        "intra": chart["intra"],
        "intraVol": chart["intraVol"],
        "indicators": ind,
        "signal": sig["signal"],
        "confidence": sig["confidence"],
        "reasons": sig.get("reasons", []),
        "risk_level": sig.get("risk_level"),
        "signal_components": components,
        "signal_sum": sum(c["val"] for c in components),
    }


async def get_market_bundles(symbols: list[str]) -> dict[str, Any]:
    """Birden fazla sembol — sembol başına paket veya hata."""
    unique = list(dict.fromkeys(s.upper() for s in symbols if s))
    out: dict[str, Any] = {}

    async def one(sym: str) -> None:
        try:
            out[sym] = await get_market_bundle(sym)
        except Exception as e:
            logger.warning("Market bundle %s: %s", sym, e)
            out[sym] = {"symbol": sym, "error": str(e)}

    await asyncio.gather(*(one(s) for s in unique))
    return out


async def get_market_snapshot(symbol: str) -> dict[str, Any]:
    """Hafif anlık paket — fiyat + sinyal (grafik yok)."""
    sym = symbol.upper()
    ind, sig, price = await asyncio.gather(
        technical_service.compute_indicators(sym),
        technical_service.generate_signal(sym),
        price_service.get_price(sym),
    )
    change_pct = float(price.get("change_pct") or 0)
    components = _signal_components(ind, change_pct)
    return {
        "symbol": sym,
        "price": price["price"],
        "change_pct": change_pct,
        "currency": price.get("currency", "USD"),
        "indicators": {"rsi": ind.get("rsi")},
        "signal": sig["signal"],
        "confidence": sig["confidence"],
        "signal_components": components,
        "signal_sum": sum(c["val"] for c in components),
    }


async def get_market_snapshots(symbols: list[str]) -> dict[str, Any]:
    """Portföy sembolleri için hafif anlık paketler."""
    unique = list(dict.fromkeys(s.upper() for s in symbols if s))
    out: dict[str, Any] = {}

    async def one(sym: str) -> None:
        try:
            out[sym] = await get_market_snapshot(sym)
        except Exception as e:
            logger.warning("Market snapshot %s: %s", sym, e)
            out[sym] = {"symbol": sym, "error": str(e)}

    await asyncio.gather(*(one(s) for s in unique))
    return out
