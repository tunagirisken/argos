"""Teknik analiz — RSI, MACD, Bollinger, EMA, hacim (pandas/numpy)."""

import asyncio
import logging
import time
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

_indicator_cache: dict[str, tuple[float, dict]] = {}
_signal_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 3600


def _load_ohlcv(symbol: str, period: str = "1y") -> pd.DataFrame:
    df = yf.Ticker(symbol.upper()).history(period=period)
    if df.empty or len(df) < 30:
        raise ValueError(f"{symbol} için yeterli veri yok")
    return df


def _rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(length).mean()
    loss = (-delta.clip(upper=0)).rolling(length).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def _macd(series: pd.Series):
    ema12 = _ema(series, 12)
    ema26 = _ema(series, 26)
    macd_line = ema12 - ema26
    signal = _ema(macd_line, 9)
    hist = macd_line - signal
    return macd_line, signal, hist


def _bbands(series: pd.Series, length: int = 20, std: float = 2.0):
    mid = series.rolling(length).mean()
    dev = series.rolling(length).std()
    return mid - std * dev, mid, mid + std * dev


def _compute_indicators_sync(symbol: str) -> dict[str, Any]:
    df = _load_ohlcv(symbol)
    close = df["Close"]
    volume = df["Volume"]

    rsi_s = _rsi(close, 14)
    macd_line, macd_signal, macd_hist = _macd(close)
    bb_lower, bb_mid, bb_upper = _bbands(close, 20)
    ema20 = _ema(close, 20)
    ema50 = _ema(close, 50)
    ema200 = _ema(close, 200)
    vol_avg = volume.rolling(20).mean()

    def _last(series):
        if series is None or series.empty:
            return None
        v = series.iloc[-1]
        return None if pd.isna(v) else float(v)

    price = float(close.iloc[-1])
    vol = float(volume.iloc[-1])
    vol_avg_val = _last(vol_avg)

    return {
        "symbol": symbol.upper(),
        "price": round(price, 2),
        "rsi": round(_last(rsi_s), 2) if _last(rsi_s) is not None else None,
        "macd": round(_last(macd_line), 4) if _last(macd_line) is not None else None,
        "macd_signal": round(_last(macd_signal), 4) if _last(macd_signal) is not None else None,
        "macd_histogram": round(_last(macd_hist), 4) if _last(macd_hist) is not None else None,
        "bb_lower": round(_last(bb_lower), 2) if _last(bb_lower) is not None else None,
        "bb_upper": round(_last(bb_upper), 2) if _last(bb_upper) is not None else None,
        "bb_mid": round(_last(bb_mid), 2) if _last(bb_mid) is not None else None,
        "ema20": round(_last(ema20), 2) if _last(ema20) is not None else None,
        "ema50": round(_last(ema50), 2) if _last(ema50) is not None else None,
        "ema200": round(_last(ema200), 2) if _last(ema200) is not None else None,
        "volume": int(vol),
        "volume_avg_20": int(vol_avg_val) if vol_avg_val else None,
        "volume_ratio": round(vol / vol_avg_val, 2) if vol_avg_val else None,
    }


def _generate_signal_from_indicators(ind: dict) -> dict[str, Any]:
    score = 0
    reasons: list[str] = []
    rsi = ind.get("rsi")
    price = ind.get("price", 0)
    bb_lower = ind.get("bb_lower")
    bb_upper = ind.get("bb_upper")
    ema20, ema50, ema200 = ind.get("ema20"), ind.get("ema50"), ind.get("ema200")
    macd_hist = ind.get("macd_histogram")
    vol_ratio = ind.get("volume_ratio") or 1.0

    if rsi is not None:
        if rsi < 30:
            score += 2
            reasons.append(f"RSI {rsi:.0f} — aşırı satım bölgesi")
        elif rsi > 75:
            score -= 2
            reasons.append(f"RSI {rsi:.0f} — aşırı alım bölgesi")
        elif rsi < 45:
            score += 1
            reasons.append(f"RSI {rsi:.0f} — zayıf alım bölgesi")
        elif rsi > 60:
            score -= 1
            reasons.append(f"RSI {rsi:.0f} — güçlü bölge")

    if macd_hist is not None:
        if macd_hist > 0:
            score += 1
            reasons.append("MACD histogram pozitif")
        else:
            score -= 1
            reasons.append("MACD histogram negatif")

    if bb_lower and bb_upper and price:
        if price <= bb_lower * 1.02:
            score += 1
            reasons.append("Fiyat alt Bollinger bandına yakın")
        elif price >= bb_upper * 0.98:
            score -= 1
            reasons.append("Fiyat üst Bollinger bandına yakın")

    if ema20 and ema50 and ema200:
        if ema20 > ema50 > ema200:
            score += 2
            reasons.append("EMA20>EMA50>EMA200 — yükseliş trendi")
        elif ema20 < ema50 < ema200:
            score -= 2
            reasons.append("EMA20<EMA50<EMA200 — düşüş trendi")

    if vol_ratio >= 1.5:
        reasons.append(f"Hacim ortalamanın {vol_ratio:.1f}x üstünde")

    if score >= 3:
        signal = "GÜÇLÜ AL"
    elif score >= 1:
        signal = "AL"
    elif score <= -3:
        signal = "GÜÇLÜ SAT"
    elif score <= -1:
        signal = "SAT"
    else:
        signal = "BEKLE"

    confidence = min(1.0, max(0.3, 0.5 + abs(score) * 0.1))
    if vol_ratio >= 1.5:
        confidence = min(1.0, confidence + 0.1)

    volatility = 0
    if bb_lower and bb_upper and price and bb_upper > bb_lower:
        volatility = (bb_upper - bb_lower) / price

    if volatility > 0.15 or (rsi and (rsi > 70 or rsi < 35)):
        risk = "YÜKSEK"
    elif volatility > 0.08:
        risk = "ORTA"
    else:
        risk = "DÜŞÜK"

    return {
        "symbol": ind["symbol"],
        "signal": signal,
        "confidence": round(confidence, 2),
        "reasons": reasons[:5] or ["Nötr teknik görünüm"],
        "risk_level": risk,
        "score": score,
    }


def _cache_get(cache: dict, key: str) -> dict | None:
    if key in cache:
        ts, data = cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


async def compute_indicators(symbol: str, use_cache: bool = True) -> dict[str, Any]:
    sym = symbol.upper()
    if use_cache:
        c = _cache_get(_indicator_cache, sym)
        if c:
            return c
    try:
        data = await asyncio.to_thread(_compute_indicators_sync, sym)
        _indicator_cache[sym] = (time.time(), data)
        return data
    except Exception as e:
        logger.error("Teknik hesaplama hatası %s: %s", sym, e)
        raise


async def generate_signal(symbol: str, use_cache: bool = True) -> dict[str, Any]:
    sym = symbol.upper()
    if use_cache:
        c = _cache_get(_signal_cache, sym)
        if c:
            return c
    ind = await compute_indicators(sym, use_cache=use_cache)
    sig = _generate_signal_from_indicators(ind)
    _signal_cache[sym] = (time.time(), sig)
    return sig


async def refresh_cache_for_symbols(symbols: list[str]) -> None:
    for sym in symbols:
        try:
            await compute_indicators(sym, use_cache=False)
            await generate_signal(sym, use_cache=False)
        except Exception as e:
            logger.warning("Cache yenileme %s: %s", sym, e)


def get_cached_rsi(symbol: str) -> float | None:
    c = _cache_get(_indicator_cache, symbol.upper())
    return c.get("rsi") if c else None
