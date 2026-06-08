"""Portföy tavsiye motoru — stop-loss, hedef ve işlem sinyali önerileri."""

import logging
from datetime import datetime, timezone
from typing import Any

from backend.services import analyst_target_service, news_service, price_service, technical_service, trade_signal_service
from backend.utils.json_store import read_json, write_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)


def _auto_levels(avg_cost: float) -> tuple[float, float]:
    return round(avg_cost * 0.92, 2), round(avg_cost * 1.15, 2)


def _suggest_stop(avg_cost: float, current: float, ind: dict[str, Any]) -> tuple[float, str]:
    """Teknik + maliyet bazlı stop-loss önerisi."""
    base_stop, _ = _auto_levels(avg_cost)
    reasons: list[str] = []

    bb_lower = ind.get("bb_lower")
    if bb_lower and isinstance(bb_lower, (int, float)) and bb_lower < current:
        tech = round(float(bb_lower) * 0.99, 2)
        if tech > base_stop:
            base_stop = tech
            reasons.append("Bollinger alt bandı")

    if current > avg_cost * 1.05:
        trail = round(current * 0.93, 2)
        if trail > base_stop:
            base_stop = trail
            reasons.append("kâr koruma (trailing)")

    if not reasons:
        reasons.append("maliyet -%8")
    return round(min(base_stop, current * 0.97), 2), " · ".join(reasons)


def _suggest_target(
    avg_cost: float,
    current: float,
    ind: dict[str, Any],
    analyst: dict[str, Any],
) -> tuple[float, str]:
    """Analist konsensüsü veya teknik üst bant hedefi."""
    rec = analyst.get("recommended_target")
    conf = analyst.get("confidence", "düşük")
    if rec:
        return round(float(rec), 2), f"analist konsensüsü ({conf})"

    bb_upper = ind.get("bb_upper")
    if bb_upper and isinstance(bb_upper, (int, float)) and float(bb_upper) > current:
        return round(float(bb_upper), 2), "Bollinger üst bandı"

    _, fallback = _auto_levels(avg_cost)
    return fallback, "maliyet +%15"


def _needs_update(current: float | None, suggested: float, threshold_pct: float = 2.0) -> bool:
    if current is None:
        return True
    if current <= 0:
        return True
    diff = abs(suggested - current) / current * 100
    return diff >= threshold_pct


async def analyze_position(pos: dict[str, Any]) -> dict[str, Any]:
    """Tek pozisyon için tam tavsiye paketi."""
    sym = str(pos.get("symbol", "")).upper()
    avg_cost = float(pos.get("avg_cost") or 0)
    shares = float(pos.get("shares") or 0)

    price_data = await price_service.get_price(sym)
    current = float(price_data.get("price") or 0)
    change_pct = float(price_data.get("change_pct") or 0)
    ind = await technical_service.compute_indicators(sym)
    tech_signal = await technical_service.generate_signal(sym)
    news = await news_service.get_news_for_symbol(sym)
    analyst = await analyst_target_service.get_analyst_target(sym)

    trade = trade_signal_service.calculate_trade_score(sym, ind, news, change_pct)

    cur_stop = pos.get("stop_loss")
    cur_target = pos.get("target")
    sug_stop, stop_reason = _suggest_stop(avg_cost, current, ind)
    sug_target, target_reason = _suggest_target(avg_cost, current, ind, analyst)

    pnl_pct = ((current - avg_cost) / avg_cost * 100) if avg_cost > 0 else 0.0
    market_value = current * shares

    stop_change = _needs_update(float(cur_stop) if cur_stop is not None else None, sug_stop)
    target_change = _needs_update(float(cur_target) if cur_target is not None else None, sug_target)

    notes: list[str] = []
    if trade.get("decision") == "SAT":
        notes.append("Trade skoru SAT — pozisyon gözden geçirilmeli")
    elif trade.get("decision") == "AL" and pnl_pct < 0:
        notes.append("Teknik AL sinyali — ekleme fırsatı olabilir")
    if stop_change:
        notes.append(f"Stop güncelleme önerilir ({stop_reason})")
    if target_change:
        notes.append(f"Hedef güncelleme önerilir ({target_reason})")
    if tech_signal.get("signal") in ("SAT", "GÜÇLÜ SAT"):
        notes.append(f"Teknik sinyal: {tech_signal.get('signal')}")
    if not notes:
        notes.append("Mevcut seviyeler uygun görünüyor")

    priority = "yüksek" if trade.get("decision") == "SAT" or stop_change else "normal"
    if target_change and trade.get("decision") == "AL":
        priority = "yüksek"

    return {
        "symbol": sym,
        "name": pos.get("name") or sym,
        "shares": shares,
        "avg_cost": avg_cost,
        "price": current,
        "change_pct": change_pct,
        "pnl_pct": round(pnl_pct, 2),
        "market_value": round(market_value, 2),
        "current_stop": cur_stop,
        "current_target": cur_target,
        "suggested_stop": sug_stop,
        "suggested_target": sug_target,
        "stop_reason": stop_reason,
        "target_reason": target_reason,
        "stop_needs_update": stop_change,
        "target_needs_update": target_change,
        "trade_decision": trade.get("decision"),
        "trade_score": trade.get("score_display"),
        "trade_confidence": trade.get("confidence"),
        "technical_signal": tech_signal.get("signal"),
        "rsi": ind.get("rsi"),
        "analyst_target": analyst.get("recommended_target"),
        "analyst_confidence": analyst.get("confidence"),
        "news_count": len(news),
        "notes": notes,
        "priority": priority,
    }


async def get_portfolio_advice() -> dict[str, Any]:
    """Tüm portföy için özet tavsiyeler."""
    data = read_json(PORTFOLIO_FILE, default={"positions": []})
    positions = data.get("positions", [])
    items: list[dict[str, Any]] = []
    for pos in positions:
        try:
            items.append(await analyze_position(pos))
        except Exception as e:
            logger.warning("Tavsiye %s: %s", pos.get("symbol"), e)
            items.append(
                {
                    "symbol": pos.get("symbol"),
                    "error": str(e),
                    "priority": "düşük",
                }
            )

    needs_action = sum(1 for i in items if i.get("stop_needs_update") or i.get("target_needs_update"))
    high_priority = sum(1 for i in items if i.get("priority") == "yüksek")

    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "position_count": len(items),
        "needs_action": needs_action,
        "high_priority": high_priority,
        "positions": items,
    }


async def apply_advice(symbols: list[str] | None = None) -> dict[str, Any]:
    """Önerilen stop/hedef değerlerini portföye uygula."""
    data = read_json(PORTFOLIO_FILE, default={"positions": []})
    positions = data.get("positions", [])
    sym_set = {s.upper() for s in symbols} if symbols else None
    applied: list[dict[str, Any]] = []

    for pos in positions:
        sym = str(pos.get("symbol", "")).upper()
        if sym_set is not None and sym not in sym_set:
            continue
        try:
            advice = await analyze_position(pos)
            old_stop = pos.get("stop_loss")
            old_target = pos.get("target")
            pos["stop_loss"] = advice["suggested_stop"]
            pos["target"] = advice["suggested_target"]
            pos["target_source"] = (
                "advisor_analyst" if advice.get("analyst_target") else "advisor_auto"
            )
            applied.append(
                {
                    "symbol": sym,
                    "old_stop": old_stop,
                    "new_stop": advice["suggested_stop"],
                    "old_target": old_target,
                    "new_target": advice["suggested_target"],
                }
            )
        except Exception as e:
            logger.error("Tavsiye uygulama %s: %s", sym, e)
            applied.append({"symbol": sym, "error": str(e)})

    if applied:
        write_json(PORTFOLIO_FILE, data)
    return {"ok": True, "applied": applied}
