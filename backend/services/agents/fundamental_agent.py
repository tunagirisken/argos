"""Temel/finansal analiz ajanı — LLM yok, saf hesaplama. Yatırım tavsiyesi değildir."""

import asyncio
import logging
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

DISCLAIMER = "Yatırım tavsiyesi değildir."


def _f(val: Any) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _pct(val: Any) -> float | None:
    v = _f(val)
    if v is None:
        return None
    return round(v * 100, 2) if abs(v) <= 1.5 else round(v, 2)


def _valuation_label(pe: float | None, peg: float | None) -> str:
    if pe is None:
        return "ADIL"
    if pe < 15:
        return "UCUZ"
    if pe < 25:
        return "ADIL"
    if pe < 40:
        return "PAHALI"
    return "ÇOK_PAHALI"


def _growth_label(rev: float | None, earn: float | None) -> str:
    rev_ok = rev is not None and rev > 5
    earn_ok = earn is not None and earn > 5
    if rev_ok and earn_ok and (rev or 0) > 15:
        return "GÜÇLÜ"
    if rev_ok or earn_ok:
        return "ORTA"
    return "ZAYIF"


def _trend_text(score: float) -> str:
    if score >= 70:
        return "Değerleme ve büyüme güçlü"
    if score >= 50:
        return "Temel görünüm makul"
    if score >= 30:
        return "Karışık sinyaller"
    return "Temel zayıflık mevcut"


def analyze_sync(symbol: str) -> dict[str, Any]:
    """yfinance temel metriklerinden skor üret."""
    sym = symbol.upper()
    info = yf.Ticker(sym).info or {}

    pe = _f(info.get("trailingPE"))
    forward_pe = _f(info.get("forwardPE"))
    peg = _f(info.get("pegRatio"))
    price_to_book = _f(info.get("priceToBook"))
    ev_ebitda = _f(info.get("enterpriseToEbitda"))

    revenue_growth = _pct(info.get("revenueGrowth"))
    earnings_growth = _pct(info.get("earningsGrowth"))
    eps_ttm = _f(info.get("trailingEps"))
    eps_forward = _f(info.get("forwardEps"))

    profit_margin = _pct(info.get("profitMargins"))
    roe = _pct(info.get("returnOnEquity"))
    roa = _pct(info.get("returnOnAssets"))

    debt_to_equity = _f(info.get("debtToEquity"))
    current_ratio = _f(info.get("currentRatio"))
    free_cashflow = _f(info.get("freeCashflow"))

    analyst_count = int(info.get("numberOfAnalystOpinions") or 0)
    recommendation = str(info.get("recommendationKey") or "")
    target_mean = _f(info.get("targetMeanPrice"))
    current_price = _f(info.get("currentPrice") or info.get("regularMarketPrice"))

    target_upside = None
    if target_mean and current_price and current_price > 0:
        target_upside = round(((target_mean / current_price) - 1) * 100, 2)

    # Skor: 50 taban, bileşen katkıları
    score = 50.0

    if pe is not None:
        if pe < 15:
            score += 25
        elif pe < 25:
            score += 15
        elif pe < 35:
            score += 5
    if peg is not None:
        if peg < 1:
            score += 20
        elif peg <= 2:
            score += 10
    if forward_pe is not None and pe is not None and forward_pe < pe:
        score += 10

    if revenue_growth is not None:
        if revenue_growth > 15:
            score += 20
        elif revenue_growth > 5:
            score += 10
        elif revenue_growth < 0:
            score -= 5
    if earnings_growth is not None:
        if earnings_growth > 20:
            score += 15
        elif earnings_growth > 5:
            score += 8
        elif earnings_growth < 0:
            score -= 5

    if debt_to_equity is not None:
        if debt_to_equity < 0.5:
            score += 10
        elif debt_to_equity <= 1.5:
            score += 5
        elif debt_to_equity > 2:
            score -= 5
    if roe is not None:
        if roe > 15:
            score += 10
        elif roe > 8:
            score += 5

    score = max(0.0, min(100.0, round(score, 1)))
    valuation = _valuation_label(pe, peg)
    growth_quality = _growth_label(revenue_growth, earnings_growth)
    trend = _trend_text(score)

    summary_parts = [trend, f"değerleme {valuation.lower()}"]
    if target_upside is not None:
        summary_parts.append(f"analist hedef +%{target_upside:.1f}")
    if recommendation:
        summary_parts.append(f"öneri {recommendation}")

    return {
        "symbol": sym,
        "score": score,
        "valuation": valuation,
        "growth_quality": growth_quality,
        "analyst_upside_pct": target_upside,
        "recommendation": recommendation,
        "metrics": {
            "pe": pe,
            "forward_pe": forward_pe,
            "peg": peg,
            "price_to_book": price_to_book,
            "ev_to_ebitda": ev_ebitda,
            "revenue_growth": revenue_growth,
            "earnings_growth": earnings_growth,
            "eps_ttm": eps_ttm,
            "eps_forward": eps_forward,
            "debt_to_equity": debt_to_equity,
            "roe": roe,
            "roa": roa,
            "profit_margin": profit_margin,
            "current_ratio": current_ratio,
            "free_cashflow": free_cashflow,
            "analyst_count": analyst_count,
        },
        "summary": ", ".join(summary_parts),
        "disclaimer": DISCLAIMER,
    }


async def analyze(symbol: str) -> dict[str, Any]:
    return await asyncio.to_thread(analyze_sync, symbol)
