"""Trade sinyal Telegram bildirimleri — karar değişimi + spam limiti."""

import logging
import uuid
from typing import Any

from backend.services import (
    claude_service,
    news_service,
    price_service,
    technical_service,
    trade_signal_service,
)
from backend.services.trade_signal_service import format_components_line
from backend.services.alert_service import _append_log, _can_send
from backend.services.telegram_service import send_message
from backend.utils.json_store import read_json
from backend.utils.market_hours import now_istanbul
from backend.utils.paths import ALERTS_LOG_FILE, PORTFOLIO_FILE

logger = logging.getLogger(__name__)

ALERT_TYPE = "TRADE_SIGNAL"
_last_decisions: dict[str, str] = {}

_DECISION_EMOJI = {"AL": "🟢", "SAT": "🔴", "İZLE": "⚪"}


def _should_notify(symbol: str, decision: str) -> bool:
    """AL/SAT ve karar değişimi; İZLE→İZLE yok."""
    if decision not in ("AL", "SAT"):
        return False
    prev = _last_decisions.get(symbol)
    if prev == decision:
        return False
    return True


def _position_return_pct(pos: dict, price: float) -> float:
    avg = float(pos.get("avg_cost") or 0)
    if not avg or not price:
        return 0.0
    return round(((price - avg) / avg) * 100, 2)


async def _send_trade_alert(
    symbol: str,
    score_data: dict[str, Any],
    position: dict | None,
    price: float,
) -> bool:
    log = read_json(ALERTS_LOG_FILE, default=[])
    if not _can_send(log, ALERT_TYPE, symbol):
        logger.info("Trade spam limiti: %s", symbol)
        return False

    decision = score_data["decision"]
    emoji = _DECISION_EMOJI.get(decision, "📊")
    header = (
        f"{emoji} {symbol} — {decision} Sinyali "
        f"(Skor: {score_data.get('score_display', score_data['score'])}/5)"
    )

    body = ""
    if position:
        try:
            body = await claude_service.trade_alert_message(
                symbol, score_data, position, price
            )
        except Exception as e:
            logger.warning("Trade LLM mesajı %s: %s", symbol, e)
            body = (
                f"Bileşenler: {format_components_line(score_data.get('components', {}))}\n"
                f"⚡ Güven: {score_data.get('confidence', 'ORTA')}"
            )
    else:
        body = (
            f"Bileşenler: {format_components_line(score_data.get('components', {}))}\n"
            f"⚡ Güven: {score_data.get('confidence', 'ORTA')}"
        )

    full = f"{header}\n{body}"
    sent = await send_message(full)
    _append_log(
        {
            "id": str(uuid.uuid4())[:8],
            "timestamp": now_istanbul().isoformat(),
            "type": ALERT_TYPE,
            "symbol": symbol,
            "message": f"{decision} skor={score_data['score']}",
            "price": price,
            "sent_telegram": sent,
        }
    )
    return sent


async def run_trade_signal_checks() -> None:
    """
    Portföy hisseleri için trade skoru — küresel (piyasa saati dışında da).
    Mevcut price/stop alarmlarına dokunmaz.
    """
    global _last_decisions
    try:
        portfolio = read_json(PORTFOLIO_FILE, default={})
        positions = portfolio.get("positions", [])
        if not positions:
            return

        for pos in positions:
            sym = pos["symbol"]
            try:
                ind = await technical_service.compute_indicators(sym)
                price_data = await price_service.get_price(sym)
                change_pct = price_data.get("change_pct")
                ind["change_pct"] = change_pct
                news = await news_service.get_news_for_symbol(sym)
                score_data = trade_signal_service.calculate_trade_score(
                    sym, ind, news, change_pct
                )
            except Exception as e:
                logger.warning("Trade skor %s: %s", sym, e)
                continue

            decision = score_data["decision"]
            price = float(price_data.get("price") or ind.get("price") or 0)

            if _should_notify(sym, decision):
                await _send_trade_alert(sym, score_data, pos, price)

            _last_decisions[sym] = decision

    except Exception as e:
        logger.exception("Trade sinyal döngüsü: %s", e)


async def get_trade_signal_for_symbol(symbol: str) -> dict[str, Any]:
    """API test — anlık skor."""
    sym = symbol.upper()
    portfolio = read_json(PORTFOLIO_FILE, default={})
    pos = next(
        (p for p in portfolio.get("positions", []) if p["symbol"] == sym),
        None,
    )
    ind = await technical_service.compute_indicators(sym)
    price_data = await price_service.get_price(sym)
    news = await news_service.get_news_for_symbol(sym)
    score_data = trade_signal_service.calculate_trade_score(
        sym, ind, news, price_data.get("change_pct")
    )
    score_data["price"] = price_data.get("price")
    score_data["last_decision"] = _last_decisions.get(sym)
    if pos:
        score_data["position"] = {
            "avg_cost": pos.get("avg_cost"),
            "return_pct": _position_return_pct(pos, float(price_data.get("price") or 0)),
        }
    return score_data


async def get_trade_signals_for_portfolio() -> list[dict[str, Any]]:
    """Portföydeki tüm hisseler için anlık trade skoru."""
    portfolio = read_json(PORTFOLIO_FILE, default={})
    positions = portfolio.get("positions", [])
    out: list[dict[str, Any]] = []
    for pos in positions:
        sym = pos.get("symbol")
        if not sym:
            continue
        try:
            out.append(await get_trade_signal_for_symbol(sym))
        except Exception as e:
            logger.warning("Trade skor %s: %s", sym, e)
    return out
