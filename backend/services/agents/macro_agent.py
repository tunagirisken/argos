"""Makro/sektör bağlamı ajanı — LLM yok. Yatırım tavsiyesi değildir."""

import asyncio
import logging
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

DISCLAIMER = "Yatırım tavsiyesi değildir."

SECTOR_ETF = {
    "Technology": "QQQ",
    "Semiconductors": "SOXX",
    "Financial Services": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Consumer Cyclical": "XLY",
    "Industrials": "XLI",
    "Communication Services": "XLC",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Basic Materials": "XLB",
    "Consumer Defensive": "XLP",
}


def _return_30d_sync(sym: str) -> float | None:
    hist = yf.Ticker(sym).history(period="1mo")
    if hist.empty or len(hist) < 2:
        return None
    first = float(hist["Close"].iloc[0])
    last = float(hist["Close"].iloc[-1])
    if first <= 0:
        return None
    return round((last / first - 1) * 100, 2)


def _vix_level(value: float | None) -> str:
    if value is None:
        return "NORMAL"
    if value < 15:
        return "DÜŞÜK"
    if value < 25:
        return "NORMAL"
    if value < 35:
        return "YÜKSEK"
    return "KRİTİK"


def _sector_momentum(ret: float | None) -> str:
    if ret is None:
        return "NÖTR"
    if ret > 5:
        return "GÜÇLÜ"
    if ret > 0:
        return "POZİTİF"
    if ret > -5:
        return "ZAYIF"
    return "NEGATİF"


def _market_regime(spy_ret: float | None, vix: float | None) -> str:
    if spy_ret is not None and spy_ret > 0 and vix is not None and vix < 20:
        return "RISK_ON"
    if vix is not None and vix >= 30:
        return "RISK_OFF"
    if spy_ret is not None and spy_ret < -3:
        return "RISK_OFF"
    return "NÖTR"


def _resolve_etf(sector: str, industry: str) -> tuple[str, str]:
    if industry in SECTOR_ETF:
        return industry, SECTOR_ETF[industry]
    if sector in SECTOR_ETF:
        return sector, SECTOR_ETF[sector]
    return sector or "Genel", "SPY"


async def analyze(symbol: str) -> dict[str, Any]:
    sym = symbol.upper()
    info = await asyncio.to_thread(lambda: yf.Ticker(sym).info or {})
    sector = str(info.get("sector") or "")
    industry = str(info.get("industry") or "")
    sector_label, etf = _resolve_etf(sector, industry)

    spy_ret, sector_ret, vix_val, sym_ret = await asyncio.gather(
        asyncio.to_thread(_return_30d_sync, "SPY"),
        asyncio.to_thread(_return_30d_sync, etf),
        asyncio.to_thread(_return_30d_sync, "^VIX"),
        asyncio.to_thread(_return_30d_sync, sym),
    )

    # VIX için son fiyat (getiri değil)
    def _vix_price() -> float | None:
        hist = yf.Ticker("^VIX").history(period="5d")
        if hist.empty:
            return None
        return round(float(hist["Close"].iloc[-1]), 2)

    vix_price = await asyncio.to_thread(_vix_price)
    vix_label = _vix_level(vix_price)
    sector_mom = _sector_momentum(sector_ret)
    vs_sector = round(sym_ret - sector_ret, 2) if sym_ret is not None and sector_ret is not None else None
    regime = _market_regime(spy_ret, vix_price)

    score = 50.0
    if spy_ret is not None and spy_ret > 0 and vix_price is not None and vix_price < 20:
        score += 30
    elif spy_ret is not None and spy_ret > 0:
        score += 20
    if sector_mom == "GÜÇLÜ":
        score += 25
    elif sector_mom == "POZİTİF":
        score += 15
    elif sector_mom == "ZAYIF":
        score += 5
    if vs_sector is not None and vs_sector > 2:
        score += 20
    elif vs_sector is not None and vs_sector > 0:
        score += 10
    elif vs_sector is not None and vs_sector < -5:
        score -= 10
    score = max(0.0, min(100.0, round(score, 1)))

    summary = (
        f"Piyasa {regime.replace('_', ' ').lower()}, VIX {vix_label.lower()}"
        f", sektör ({sector_label}) {sector_mom.lower()}"
    )
    if vs_sector is not None:
        summary += f", hisse sektöre göre {vs_sector:+.1f}%"

    return {
        "symbol": sym,
        "score": score,
        "sector": sector_label,
        "sector_etf": etf,
        "market_regime": regime,
        "sector_momentum": sector_mom,
        "vix_level": vix_label,
        "vix_value": vix_price,
        "spy_return_30d": spy_ret,
        "sector_return_30d": sector_ret,
        "symbol_return_30d": sym_ret,
        "vs_sector": vs_sector,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }
