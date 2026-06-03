"""Alarm motoru — otomatik kurallar + kullanıcı alarmları + spam önleme."""

import logging
import uuid
from datetime import datetime
from typing import Any

from backend.services import claude_service, price_service, technical_service
from backend.services.telegram_service import notify_error, send_message
from backend.utils.json_store import read_json, write_json
from backend.utils.market_hours import is_us_market_hours, now_istanbul
from backend.utils.paths import ALERTS_FILE, ALERTS_LOG_FILE, PORTFOLIO_FILE

logger = logging.getLogger(__name__)

MAX_ALERTS_PER_DAY = 3

ALERT_EMOJI = {
    "STOP_LOSS_URGENT": "🚨 ACİL",
    "STOP_LOSS_WARN": "⚠️ UYARI",
    "TARGET_HIT": "🎯 HEDEF",
    "BIG_MOVE": "📊 HAREKET",
    "RSI_OVERBOUGHT": "📈 AŞIRI ALIM",
    "RSI_OVERSOLD": "📉 AŞIRI SATIM",
    "CUSTOM": "🔔",
}


def _today_key() -> str:
    return now_istanbul().strftime("%Y-%m-%d")


def _count_today(log: list, alert_type: str, symbol: str) -> int:
    """Bugün aynı tip+sembol kaç kez tetiklendi."""
    today = _today_key()
    return sum(
        1
        for e in log
        if e.get("type") == alert_type
        and e.get("symbol") == symbol
        and (e.get("timestamp") or "")[:10] == today
    )


def _can_send(log: list, alert_type: str, symbol: str) -> bool:
    return _count_today(log, alert_type, symbol) < MAX_ALERTS_PER_DAY


def _append_log(entry: dict) -> None:
    log = read_json(ALERTS_LOG_FILE, default=[])
    log.append(entry)
    # Son 500 kayıt
    if len(log) > 500:
        log = log[-500:]
    write_json(ALERTS_LOG_FILE, log)


async def _trigger_alert(
    alert_type: str,
    symbol: str,
    message: str,
    price: float | None = None,
    use_claude: bool = False,
    portfolio: dict | None = None,
    position: dict | None = None,
) -> bool:
    """Alarm tetikle, logla, Telegram gönder."""
    log = read_json(ALERTS_LOG_FILE, default=[])
    if not _can_send(log, alert_type, symbol):
        logger.info("Spam limiti: %s %s", alert_type, symbol)
        return False

    emoji = ALERT_EMOJI.get(alert_type, "🔔")
    full_message = f"{emoji} {symbol}\n{message}"

    if use_claude and position and portfolio:
        try:
            claude_msg = await claude_service.stop_loss_alert_message(
                symbol,
                price or 0,
                position.get("stop_loss", 0),
                portfolio,
            )
            full_message += f"\n\n💡 {claude_msg}"
        except Exception as e:
            logger.warning("Claude alarm mesajı hatası: %s", e)

    sent = await send_message(full_message)
    entry = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": now_istanbul().isoformat(),
        "type": alert_type,
        "symbol": symbol,
        "message": message,
        "price": price,
        "sent_telegram": sent,
    }
    _append_log(entry)
    return True


def _check_custom_alert(alert: dict, price: float) -> bool:
    """Kullanıcı tanımlı alarm koşulu."""
    cond = alert.get("condition", "")
    val = float(alert.get("value", 0))
    if cond == "price_above":
        return price >= val
    if cond == "price_below":
        return price <= val
    if cond == "price_equals":
        return abs(price - val) < 0.01
    return False


async def run_checks() -> None:
    """5 dakikalık alarm döngüsü — piyasa saatlerinde."""
    if not is_us_market_hours():
        return

    try:
        portfolio = read_json(PORTFOLIO_FILE, default={})
        positions = portfolio.get("positions", [])
        custom_alerts = read_json(ALERTS_FILE, default=[])

        for pos in positions:
            sym = pos["symbol"]
            try:
                price_data = await price_service.get_price(sym)
            except Exception as e:
                logger.error("Alarm fiyat hatası %s: %s", sym, e)
                await notify_error(f"Alarm fiyat {sym}", str(e))
                continue

            price = price_data.get("price", 0)
            change_pct = abs(price_data.get("change_pct", 0))
            stop = pos.get("stop_loss")
            target = pos.get("target")

            # 1. Stop-loss ACİL
            if stop and price <= stop:
                await _trigger_alert(
                    "STOP_LOSS_URGENT",
                    sym,
                    f"Fiyat ${price:.2f} ≤ stop ${stop:.2f}",
                    price,
                    use_claude=True,
                    portfolio=portfolio,
                    position=pos,
                )
            # 2. Stop uyarı %3
            elif stop and price <= stop * 1.03:
                await _trigger_alert(
                    "STOP_LOSS_WARN",
                    sym,
                    f"Fiyat ${price:.2f} stop'a yakın (${stop:.2f})",
                    price,
                )
            # 3. Hedef
            if target and price >= target:
                await _trigger_alert(
                    "TARGET_HIT",
                    sym,
                    f"Fiyat ${price:.2f} ≥ hedef ${target:.2f}",
                    price,
                )
            # 4. Büyük hareket
            if change_pct >= 5:
                await _trigger_alert(
                    "BIG_MOVE",
                    sym,
                    f"Günlük değişim %{change_pct:.1f}",
                    price,
                )

            # 5-6. RSI
            try:
                ind = await technical_service.compute_indicators(sym)
                rsi = ind.get("rsi")
                if rsi and rsi > 75:
                    await _trigger_alert(
                        "RSI_OVERBOUGHT",
                        sym,
                        f"RSI {rsi:.0f} — aşırı alım",
                        price,
                    )
                elif rsi and rsi < 30:
                    await _trigger_alert(
                        "RSI_OVERSOLD",
                        sym,
                        f"RSI {rsi:.0f} — aşırı satım",
                        price,
                    )
            except Exception as e:
                logger.warning("RSI alarm %s: %s", sym, e)

        # Kullanıcı alarmları
        for alert in custom_alerts:
            if not alert.get("enabled", True):
                continue
            sym = alert.get("symbol", "")
            try:
                pd = await price_service.get_price(sym)
                price = pd.get("price", 0)
                if _check_custom_alert(alert, price):
                    await _trigger_alert(
                        "CUSTOM",
                        sym,
                        alert.get("message", f"Özel alarm: {alert.get('condition')} {alert.get('value')}"),
                        price,
                    )
            except Exception as e:
                logger.warning("Özel alarm %s: %s", sym, e)

    except Exception as e:
        logger.exception("Alarm döngüsü hatası: %s", e)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except ImportError:
            pass
        await notify_error("Alert servisi", str(e))


def list_custom_alerts() -> list:
    return read_json(ALERTS_FILE, default=[])


def create_custom_alert(data: dict) -> dict:
    alerts = read_json(ALERTS_FILE, default=[])
    alert = {
        "id": str(uuid.uuid4())[:8],
        "symbol": data["symbol"].upper(),
        "condition": data["condition"],
        "value": float(data["value"]),
        "message": data.get("message", ""),
        "enabled": data.get("enabled", True),
        "created_at": now_istanbul().isoformat(),
    }
    alerts.append(alert)
    write_json(ALERTS_FILE, alerts)
    return alert


def delete_custom_alert(alert_id: str) -> bool:
    alerts = read_json(ALERTS_FILE, default=[])
    new_alerts = [a for a in alerts if a.get("id") != alert_id]
    if len(new_alerts) == len(alerts):
        return False
    write_json(ALERTS_FILE, new_alerts)
    return True


def get_alert_log(limit: int = 100) -> list:
    log = read_json(ALERTS_LOG_FILE, default=[])
    return sorted(log, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
