"""Keşif motoru — 4 katmanlı huni (LLM yalnızca top 5)."""

import asyncio
import logging
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

from backend.services import claude_service, news_service
from backend.services.trade_signal_service import NEGATIVE_WORDS, POSITIVE_WORDS
from backend.utils.json_store import read_json, write_json
from backend.utils.market_hours import now_istanbul
from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)

UNIVERSE_FILE = DATA_DIR / "discovery_universe.json"
LAST_DISCOVERY_FILE = DATA_DIR / "last_discovery.json"

BATCH_CHUNK = 40
MIN_VOL_RATIO = 1.2
MIN_ATR_PCT = 0.018
MIN_MOVE_PCT = 4.0
TOP_N = 5
DISCLAIMER = "Yatırım tavsiyesi değildir; kişisel analiz amaçlıdır."
DEFAULT_HORIZON = "2-6 hafta"

WEIGHTS = {
    "momentum": 0.25,
    "volatility": 0.20,
    "volume": 0.15,
    "technical": 0.20,
    "news": 0.20,
}

_cache_day: str | None = None
_cache_result: dict | None = None


def _today() -> str:
    return now_istanbul().strftime("%Y-%m-%d")


def _load_universe() -> list[str]:
    data = read_json(UNIVERSE_FILE, default={})
    syms = data.get("symbols", [])
    return [str(s).upper() for s in syms if s]


def _download_batch(symbols: list[str], period: str = "3mo") -> dict[str, pd.DataFrame]:
    """yfinance toplu indirme — sembol başına OHLCV."""
    out: dict[str, pd.DataFrame] = {}
    for i in range(0, len(symbols), BATCH_CHUNK):
        chunk = symbols[i : i + BATCH_CHUNK]
        tickers = " ".join(chunk)
        try:
            raw = yf.download(
                tickers,
                period=period,
                group_by="ticker",
                threads=True,
                progress=False,
                auto_adjust=True,
            )
        except Exception as e:
            logger.warning("Keşif batch indirme: %s", e)
            continue
        if raw is None or raw.empty:
            continue
        if len(chunk) == 1:
            sym = chunk[0]
            if isinstance(raw.columns, pd.MultiIndex):
                out[sym] = raw.copy()
            else:
                out[sym] = raw.copy()
            continue
        for sym in chunk:
            try:
                if sym in raw.columns.get_level_values(0):
                    out[sym] = raw[sym].dropna(how="all")
            except Exception:
                pass
    return out


def build_candidate_pool() -> list[str]:
    """Evren + günlük hareketli/hacimli semboller."""
    base = set(_load_universe())
    if not base:
        return []

    data = _download_batch(list(base), period="1mo")
    movers: set[str] = set()
    for sym, df in data.items():
        if df is None or len(df) < 3:
            continue
        close = df["Close"]
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]
        vol = df["Volume"]
        if isinstance(vol, pd.DataFrame):
            vol = vol.iloc[:, 0]
        chg = abs((float(close.iloc[-1]) / float(close.iloc[-2]) - 1) * 100)
        vol_avg = float(vol.iloc[-21:-1].mean()) if len(vol) > 21 else float(vol.mean())
        vol_last = float(vol.iloc[-1])
        if chg >= MIN_MOVE_PCT or (vol_avg > 0 and vol_last / vol_avg >= MIN_VOL_RATIO):
            movers.add(sym)

    pool = sorted(base | movers)
    logger.info("Keşif havuzu: %d sembol (evren %d, hareket %d)", len(pool), len(base), len(movers))
    return pool


def _atr_pct(df: pd.DataFrame, period: int = 14) -> float:
    high = df["High"]
    low = df["Low"]
    close = df["Close"]
    if isinstance(high, pd.DataFrame):
        high, low, close = high.iloc[:, 0], low.iloc[:, 0], close.iloc[:, 0]
    tr = pd.concat(
        [
            high - low,
            (high - close.shift()).abs(),
            (low - close.shift()).abs(),
        ],
        axis=1,
    ).max(axis=1)
    atr = tr.rolling(period).mean().iloc[-1]
    price = float(close.iloc[-1])
    if not price or pd.isna(atr):
        return 0.0
    return float(atr / price)


def _rsi(close: pd.Series, period: int = 14) -> float:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    val = 100 - (100 / (1 + rs))
    v = val.iloc[-1]
    return float(v) if not pd.isna(v) else 50.0


def _compute_metrics(sym: str, df: pd.DataFrame) -> dict[str, Any] | None:
    if df is None or len(df) < 25:
        return None
    close = df["Close"]
    vol = df["Volume"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    if isinstance(vol, pd.DataFrame):
        vol = vol.iloc[:, 0]

    price = float(close.iloc[-1])
    mom5 = (price / float(close.iloc[-6]) - 1) * 100 if len(close) > 6 else 0.0
    mom20 = (price / float(close.iloc[-21]) - 1) * 100 if len(close) > 21 else 0.0
    vol_avg = float(vol.iloc[-21:-1].mean()) or 1.0
    vol_ratio = float(vol.iloc[-1]) / vol_avg
    atr_pct = _atr_pct(df)
    rsi = _rsi(close)
    hi52 = float(close.max())
    lo52 = float(close.min())
    pos52 = (price - lo52) / (hi52 - lo52) if hi52 > lo52 else 0.5

    return {
        "symbol": sym,
        "price": round(price, 2),
        "atr_pct": round(atr_pct, 4),
        "vol_ratio": round(vol_ratio, 2),
        "rsi": round(rsi, 1),
        "mom5": round(mom5, 2),
        "mom20": round(mom20, 2),
        "pos52": round(pos52, 3),
    }


def prefilter_candidates(symbols: list[str]) -> list[dict]:
    """Katman 2 — sayısal ön eleme."""
    data = _download_batch(symbols, period="3mo")
    passed: list[dict] = []
    for sym, df in data.items():
        m = _compute_metrics(sym, df)
        if not m:
            continue
        if m["atr_pct"] >= MIN_ATR_PCT and m["vol_ratio"] >= MIN_VOL_RATIO:
            passed.append(m)
    passed.sort(key=lambda x: x["atr_pct"] * x["vol_ratio"], reverse=True)
    logger.info("Keşif ön eleme: %d → %d", len(symbols), len(passed))
    return passed[:25]


def _norm_0_100(value: float, low: float, high: float) -> float:
    if high <= low:
        return 50.0
    return float(max(0, min(100, (value - low) / (high - low) * 100)))


def _news_sentiment_score(headlines: list[str]) -> float:
    if not headlines:
        return 50.0
    pos = neg = 0
    for t in headlines:
        tl = t.lower()
        if any(w in tl for w in NEGATIVE_WORDS):
            neg += 1
        elif any(w in tl for w in POSITIVE_WORDS):
            pos += 1
    if neg > pos:
        return 25.0
    if pos > neg:
        return 80.0
    return 50.0


async def score_candidate(symbol: str, metrics: dict, news: list[dict] | None = None) -> dict:
    """Katman 3 — 0-100 ağırlıklı skor."""
    mom = abs(metrics.get("mom5", 0)) * 0.4 + abs(metrics.get("mom20", 0)) * 0.6
    momentum_s = _norm_0_100(mom, 2, 25)

    atr = metrics.get("atr_pct", 0)
    vol_s = 100 - abs(atr - 0.035) / 0.035 * 50 if atr else 50
    vol_s = max(0, min(100, vol_s))

    volume_s = _norm_0_100(metrics.get("vol_ratio", 1), 1.0, 3.0)

    rsi = metrics.get("rsi", 50)
    if 35 <= rsi <= 55:
        tech_rsi = 85
    elif rsi < 35:
        tech_rsi = 75
    elif rsi > 70:
        tech_rsi = 30
    else:
        tech_rsi = 55
    pos52 = metrics.get("pos52", 0.5)
    bb_pos = 70 if pos52 < 0.35 else (40 if pos52 > 0.85 else 60)
    technical_s = (tech_rsi + bb_pos) / 2

    if news is None:
        try:
            news = await news_service.get_news_for_symbol(symbol)
        except Exception:
            news = []
    headlines = [n.get("title", "") for n in (news or [])[:3]]
    news_s = _news_sentiment_score(headlines)

    breakdown = {
        "momentum": round(momentum_s, 1),
        "volatility": round(vol_s, 1),
        "volume": round(volume_s, 1),
        "technical": round(technical_s, 1),
        "news": round(news_s, 1),
    }
    total = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)
    sector = "—"
    name = symbol
    try:
        info = await asyncio.to_thread(lambda: yf.Ticker(symbol).info or {})
        sector = info.get("sector") or info.get("industry") or "—"
        name = info.get("shortName") or info.get("longName") or symbol
    except Exception:
        pass

    return {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "score": round(total, 1),
        "breakdown": breakdown,
        "metrics": metrics,
        "news_count": len(news or []),
        "headlines": headlines,
    }


async def generate_opportunity_thesis(scored: list[dict]) -> list[dict]:
    """Katman 4 — top 5 LLM (250 token/hisse)."""
    opportunities: list[dict] = []
    for item in scored[:TOP_N]:
        sym = item["symbol"]
        m = item["metrics"]
        price = m.get("price", 0)
        entry_lo = round(price * 0.97, 2)
        entry_hi = round(price * 1.03, 2)
        entry_zone = f"${entry_lo}-${entry_hi}"
        try:
            thesis_text = await claude_service.discovery_thesis(
                item, entry_zone, DEFAULT_HORIZON
            )
        except Exception as e:
            logger.warning("Keşif LLM %s: %s", sym, e)
            thesis_text = (
                f"Skor {item['score']}/100 — momentum ve hacim öne çıkıyor. "
                f"⚠️ Volatilite yüksek. {DISCLAIMER}"
            )
        main_risk = "Volatilite ve haber akışı"
        if "⚠️" in thesis_text:
            parts = thesis_text.split("⚠️", 1)
            if len(parts) > 1:
                main_risk = parts[1].strip().split("\n")[0][:120]

        opportunities.append(
            {
                "symbol": sym,
                "name": item.get("name", sym),
                "sector": item.get("sector", "—"),
                "score": item["score"],
                "decision_horizon": DEFAULT_HORIZON,
                "breakdown": item["breakdown"],
                "current_price": price,
                "entry_zone": entry_zone,
                "thesis": thesis_text,
                "main_risk": main_risk,
                "news_count": item.get("news_count", 0),
                "disclaimer": DISCLAIMER,
            }
        )
    return opportunities


async def run_discovery(force: bool = False) -> dict:
    """Tam keşif akışı; aynı gün cache."""
    global _cache_day, _cache_result
    today = _today()

    if not force and _cache_day == today and _cache_result:
        return _cache_result

    if not force and LAST_DISCOVERY_FILE.is_file():
        cached = read_json(LAST_DISCOVERY_FILE, default={})
        if (cached.get("generated_at") or "")[:10] == today:
            _cache_day = today
            _cache_result = cached
            return cached

    pool = await asyncio.to_thread(build_candidate_pool)
    scanned = len(pool)
    prefiltered = await asyncio.to_thread(prefilter_candidates, pool)

    scored: list[dict] = []
    for m in prefiltered:
        try:
            s = await score_candidate(m["symbol"], m)
            scored.append(s)
        except Exception as e:
            logger.warning("Keşif skor %s: %s", m["symbol"], e)

    scored.sort(key=lambda x: x["score"], reverse=True)
    opportunities = await generate_opportunity_thesis(scored)

    result = {
        "generated_at": now_istanbul().isoformat(timespec="seconds"),
        "scanned_count": scanned,
        "prefilter_count": len(prefiltered),
        "opportunities": opportunities,
        "disclaimer": DISCLAIMER,
    }
    write_json(LAST_DISCOVERY_FILE, result)
    _cache_day = today
    _cache_result = result
    logger.info("Keşif tamamlandı: %d taranan, %d fırsat", scanned, len(opportunities))
    return result
