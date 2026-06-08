"""5 ajan paralel derin analiz + tek LLM sentez. Yatırım tavsiyesi değildir."""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from backend.services import news_service, price_service, technical_service, trade_signal_service
from backend.services.agents import fundamental_agent, macro_agent
from backend.services.llm_service import call_llm
from backend.utils.json_store import read_json, write_json
from backend.utils.market_hours import now_istanbul
from backend.utils.paths import DATA_DIR, PORTFOLIO_FILE

logger = logging.getLogger(__name__)

DISCLAIMER = "Yatırım tavsiyesi değildir."
CACHE_DIR = DATA_DIR / "analysis_cache"

WEIGHTS = {
    "technical": 0.30,
    "fundamental": 0.20,
    "macro": 0.20,
    "sentiment": 0.15,
    "risk": 0.15,
}


def _cache_path(symbol: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{symbol.upper()}.json"


def _cache_valid(data: dict) -> bool:
    """Aynı gün (İstanbul) içinde önbellek geçerli."""
    gen = data.get("generated_at")
    if not gen:
        return False
    try:
        from datetime import datetime

        ts = datetime.fromisoformat(str(gen).replace("Z", "+00:00"))
        if ts.tzinfo:
            ts = ts.astimezone(now_istanbul().tzinfo)
        return ts.date() == now_istanbul().date()
    except (ValueError, TypeError):
        return False


def read_cached_analysis(symbol: str) -> dict | None:
    path = _cache_path(symbol)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if _cache_valid(data) else None
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Analiz önbellek okuma %s: %s", symbol, e)
        return None


def write_cached_analysis(symbol: str, payload: dict) -> None:
    write_json(_cache_path(symbol), payload)


def _run_technical_agent(symbol: str, ind: dict, news: list, change_pct: float | None) -> dict:
    score_data = trade_signal_service.calculate_trade_score(symbol, ind, news, change_pct)
    raw = float(score_data["score"])
    normalized = max(0, min(100, (raw + 3.8) / 7.6 * 100))
    rsi = ind.get("rsi") or 50
    hist = ind.get("macd_histogram") or 0
    trend = "YÜKSELİŞ" if normalized > 60 else "DÜŞÜŞ" if normalized < 40 else "YATAY"
    return {
        "score": round(normalized, 1),
        "trend": trend,
        "rsi": rsi,
        "macd_signal": "POZİTİF" if hist > 0 else "NEGATİF",
        "components": score_data["components"],
        "decision": score_data.get("decision"),
        "summary": (
            f"RSI {rsi:.0f}, MACD {'pozitif' if hist > 0 else 'negatif'}, "
            f"teknik skor {normalized:.0f}/100"
        ),
    }


def _run_sentiment_agent(news: list | None) -> dict:
    headlines = [n.get("title", "") for n in (news or [])[:5]]
    pos = neg = 0
    for h in headlines:
        hl = h.lower()
        if any(w in hl for w in trade_signal_service.NEGATIVE_WORDS):
            neg += 1
        elif any(w in hl for w in trade_signal_service.POSITIVE_WORDS):
            pos += 1
    net = pos - neg
    score = max(0, min(100, 50 + net * 15))
    label = "POZİTİF" if net > 0 else "NEGATİF" if net < 0 else "NÖTR"
    return {
        "score": round(score, 1),
        "news_sentiment": label,
        "positive_count": pos,
        "negative_count": neg,
        "headlines_analyzed": len(headlines),
        "summary": f"{len(headlines)} haber tarandı: {pos} pozitif, {neg} negatif",
    }


def _run_risk_agent(ind: dict, price: float, position: dict | None) -> dict:
    alerts: list[str] = []
    score = 70.0
    stop_dist = None
    volatility_pct = None
    rr = None

    if position and position.get("stop_loss") and price:
        stop = float(position["stop_loss"])
        stop_dist = round(((price - stop) / price) * 100, 1)
        if stop_dist < 5:
            score -= 30
            alerts.append(f"Stop-loss kritik yakın: %{stop_dist:.1f}")
        elif stop_dist < 10:
            score -= 15
            alerts.append(f"Stop-loss izle: %{stop_dist:.1f}")

    bb_l = ind.get("bb_lower")
    bb_u = ind.get("bb_upper")
    if bb_l and bb_u and price:
        volatility_pct = round(((bb_u - bb_l) / price) * 100, 1)
        if volatility_pct > 15:
            score -= 15
            alerts.append(f"Yüksek volatilite: %{volatility_pct:.1f}")

    rsi = ind.get("rsi", 50)
    if rsi and (rsi > 75 or rsi < 25):
        score -= 10
        alerts.append(f"RSI aşırı bölge: {rsi:.0f}")

    if position:
        stop = float(position.get("stop_loss") or 0)
        target = float(position.get("target") or 0)
        if stop and target and price and stop < price < target:
            risk_amt = price - stop
            reward = target - price
            rr = round(reward / risk_amt, 2) if risk_amt > 0 else None
            if rr and rr < 1.5:
                score -= 10
                alerts.append(f"Düşük R/R oranı: {rr:.1f}")
            elif rr and rr >= 3:
                score += 10

    score = max(0, min(100, score))
    risk_level = (
        "KRİTİK" if score < 30 else "YÜKSEK" if score < 50 else "ORTA" if score < 70 else "DÜŞÜK"
    )
    summary = f"Risk {risk_level}"
    if stop_dist is not None:
        summary += f", stop %{stop_dist:.1f} uzakta"
    if rr is not None:
        summary += f", R/R {rr:.1f}"

    return {
        "score": round(score, 1),
        "risk_level": risk_level,
        "stop_distance_pct": stop_dist,
        "volatility_pct": volatility_pct,
        "risk_reward": rr,
        "alerts": alerts,
        "summary": summary,
    }


async def _llm_synthesis(
    symbol: str,
    composite: float,
    tech: dict,
    fund: dict,
    macro: dict,
    sent: dict,
    risk: dict,
    price: float,
    position: dict | None,
) -> str:
    pos_str = ""
    if position:
        avg = float(position.get("avg_cost") or 0)
        ret = round(((price - avg) / avg) * 100, 2) if avg and price else 0
        pos_str = f"\nPozisyon: maliyet ${avg:.2f}, getiri {ret:+.1f}%"

    prompt = f"""5 uzman ajan analizi — {symbol} (${price:.2f}){pos_str}

TEKNİK ({tech['score']:.0f}/100): {tech['summary']}
TEMEL ({fund['score']:.0f}/100): {fund['summary']}
MAKRO ({macro['score']:.0f}/100): {macro['summary']}
SENTIMENT ({sent['score']:.0f}/100): {sent['summary']}
RİSK (skor:{risk['score']:.0f}/100): {risk['summary']}
Bileşik skor: {composite:.0f}/100

Şu formatta yaz (başka format yok):
KARAR: [GÜÇLÜ AL / AL / BEKLE / SAT / GÜÇLÜ SAT]
GÜVEN: [%xx]
GEREKÇE: [2-3 cümle — çelişkiler varsa değerlendir]
AKSİYON: [giriş bölgesi veya aksiyon, stop, hedef, zaman ufku]
RİSK: [1 cümle kritik risk]"""

    system = (
        "Kıdemli portföy analistisin. Türkçe, net, abartısız yaz. "
        "Sadece verilen formatı kullan, ekstra açıklama ekleme. "
        "Yatırım tavsiyesi değildir; bilgilendirme amaçlıdır."
    )
    return await call_llm(prompt, max_tokens=600, system=system)


async def run_deep_analysis(symbol: str, *, use_cache: bool = True) -> dict[str, Any]:
    """5 ajan paralel + LLM sentez."""
    sym = symbol.upper()
    if use_cache:
        cached = read_cached_analysis(sym)
        if cached:
            logger.info("Derin analiz önbellek: %s", sym)
            return cached

    ind, price_data, news = await asyncio.gather(
        technical_service.compute_indicators(sym),
        price_service.get_price(sym),
        news_service.get_news_for_symbol(sym),
    )
    price = float(price_data.get("price") or ind.get("price") or 0)
    change_pct = price_data.get("change_pct")

    portfolio = read_json(PORTFOLIO_FILE, default={})
    position = next(
        (p for p in portfolio.get("positions", []) if p.get("symbol") == sym),
        None,
    )

    tech_result = _run_technical_agent(sym, ind, news, change_pct)
    fund_result, macro_result = await asyncio.gather(
        fundamental_agent.analyze(sym),
        macro_agent.analyze(sym),
    )
    sentiment_result = _run_sentiment_agent(news)
    risk_result = _run_risk_agent(ind, price, position)

    risk_contribution = 100 - risk_result["score"]
    composite = (
        tech_result["score"] * WEIGHTS["technical"]
        + fund_result["score"] * WEIGHTS["fundamental"]
        + macro_result["score"] * WEIGHTS["macro"]
        + sentiment_result["score"] * WEIGHTS["sentiment"]
        + risk_contribution * WEIGHTS["risk"]
    )

    verdict = await _llm_synthesis(
        sym, composite, tech_result, fund_result, macro_result,
        sentiment_result, risk_result, price, position,
    )

    result = {
        "symbol": sym,
        "price": price,
        "composite_score": round(composite, 1),
        "verdict": verdict,
        "agents": {
            "technical": tech_result,
            "fundamental": fund_result,
            "macro": macro_result,
            "sentiment": sentiment_result,
            "risk": risk_result,
        },
        "generated_at": now_istanbul().isoformat(timespec="seconds"),
        "position": position,
        "disclaimer": DISCLAIMER,
    }
    write_cached_analysis(sym, result)
    return result
