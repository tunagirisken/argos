"""Grafik serileri — yfinance OHLCV (lightweight-charts uyumlu)."""

import asyncio
import logging
import time
from typing import Any

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

CHART_CACHE_TTL = 300
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _bar_color(open_p: float, close_p: float) -> str:
    return "rgba(38,166,154,0.45)" if close_p >= open_p else "rgba(239,83,80,0.45)"


def _daily_bars(df: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    ohlc: list[dict] = []
    vol: list[dict] = []
    for ts, row in df.iterrows():
        if pd.isna(row.get("Open")) or pd.isna(row.get("Close")):
            continue
        t = pd.Timestamp(ts)
        if t.tzinfo is not None:
            t = t.tz_convert("UTC").tz_localize(None)
        time_key = t.strftime("%Y-%m-%d")
        o, c = float(row["Open"]), float(row["Close"])
        ohlc.append(
            {
                "time": time_key,
                "open": round(o, 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(c, 2),
            }
        )
        vol.append(
            {
                "time": time_key,
                "value": int(row.get("Volume", 0) or 0),
                "color": _bar_color(o, c),
            }
        )
    return ohlc, vol


def _intra_bars(df: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    ohlc: list[dict] = []
    vol: list[dict] = []
    for ts, row in df.iterrows():
        if pd.isna(row.get("Open")) or pd.isna(row.get("Close")):
            continue
        t = pd.Timestamp(ts)
        if t.tzinfo is not None:
            t = t.tz_convert("UTC")
        time_key = int(t.timestamp())
        o, c = float(row["Open"]), float(row["Close"])
        ohlc.append(
            {
                "time": time_key,
                "open": round(o, 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(c, 2),
            }
        )
        vol.append(
            {
                "time": time_key,
                "value": int(row.get("Volume", 0) or 0),
                "color": _bar_color(o, c),
            }
        )
    return ohlc, vol


def _fetch_chart_sync(symbol: str) -> dict[str, Any]:
    sym = symbol.upper()
    ticker = yf.Ticker(sym)
    daily_df = ticker.history(period="2y", interval="1d", auto_adjust=True)
    intra_df = ticker.history(period="5d", interval="1h", auto_adjust=True)
    if daily_df.empty:
        raise ValueError(f"{sym} için günlük grafik verisi yok")

    daily, daily_vol = _daily_bars(daily_df)
    if intra_df.empty:
        intra, intra_vol = [], []
    else:
        intra, intra_vol = _intra_bars(intra_df)

    return {
        "symbol": sym,
        "daily": daily,
        "dailyVol": daily_vol,
        "intra": intra,
        "intraVol": intra_vol,
    }


async def get_chart_series(symbol: str) -> dict[str, Any]:
    """Sembol için günlük (2y) + saatlik (5g) grafik serisi."""
    sym = symbol.upper()
    cached = _cache.get(sym)
    if cached and time.time() - cached[0] < CHART_CACHE_TTL:
        return cached[1]

    data = await asyncio.to_thread(_fetch_chart_sync, sym)
    _cache[sym] = (time.time(), data)
    return data
