"""APScheduler — UTC+3 (Europe/Istanbul) zamanlanmış görevler."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.services import (
    alert_service,
    claude_service,
    discovery_service,
    news_service,
    price_service,
    technical_service,
    trade_alert_service,
)
from backend.services.telegram_service import send_message
from backend.utils import formatters
from backend.utils.json_store import read_json
from backend.utils.market_hours import is_weekday
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def _symbols() -> list[str]:
    portfolio = read_json(PORTFOLIO_FILE, default={})
    return [p["symbol"] for p in portfolio.get("positions", [])]


async def _gather_briefing_data() -> tuple:
    portfolio = read_json(PORTFOLIO_FILE, default={})
    syms = _symbols()
    prices = await price_service.get_prices(syms)
    signals = {}
    all_news = []
    for sym in syms:
        try:
            signals[sym] = await technical_service.generate_signal(sym)
        except Exception as e:
            logger.warning("Brifing sinyal %s: %s", sym, e)
        try:
            all_news.extend((await news_service.get_news_for_symbol(sym))[:2])
        except Exception:
            pass
    return portfolio, prices, signals, all_news


async def job_morning_briefing():
    """09:00 sabah brifing — Claude."""
    if not is_weekday():
        return
    logger.info("Sabah brifing başlıyor")
    try:
        portfolio, prices, signals, news = await _gather_briefing_data()
        text = await claude_service.morning_briefing(portfolio, prices, signals, news)
        await send_message(f"☀️ Sabah Brifing\n\n{text}")
        try:
            discovery = await discovery_service.run_discovery(force=False)
            await send_message(formatters.format_discovery_report(discovery))
        except Exception as de:
            logger.exception("Sabah keşif hatası: %s", de)
    except Exception as e:
        logger.exception("Sabah brifing hatası: %s", e)


async def job_market_open_report():
    """16:30 açılış — fiyat + sinyal, Claude yok."""
    if not is_weekday():
        return
    logger.info("Açılış raporu başlıyor")
    try:
        syms = _symbols()
        prices = await price_service.get_prices(syms)
        signals = {}
        for sym in syms:
            try:
                signals[sym] = await technical_service.generate_signal(sym)
            except Exception:
                pass
        msg = (
            "🔔 ABD Piyasası Açıldı\n\n"
            f"{formatters.format_price_table(prices, syms)}\n\n"
            f"{formatters.format_signal_summary(signals)}"
        )
        await send_message(msg)
    except Exception as e:
        logger.exception("Açılış raporu hatası: %s", e)


async def job_closing_report():
    """23:05 kapanış — Claude."""
    if not is_weekday():
        return
    logger.info("Kapanış raporu başlıyor")
    try:
        portfolio, prices, signals, news = await _gather_briefing_data()
        text = await claude_service.closing_report(portfolio, prices, signals, news)
        await send_message(f"🌙 Kapanış Raporu\n\n{text}")
    except Exception as e:
        logger.exception("Kapanış raporu hatası: %s", e)


async def job_alert_checks():
    """Her 5 dk alarm + trade sinyal kontrolü."""
    await alert_service.run_checks()
    await trade_alert_service.run_trade_signal_checks()


async def job_refresh_technical():
    """Saatlik teknik cache yenileme."""
    syms = _symbols()
    await technical_service.refresh_cache_for_symbols(syms)
    logger.info("Teknik cache yenilendi: %s", syms)


def start_scheduler() -> AsyncIOScheduler:
    """Scheduler'ı başlatır."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="Europe/Istanbul")

    # 09:00 sabah brifing (hafta içi)
    _scheduler.add_job(
        job_morning_briefing,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=0),
        id="morning_briefing",
        replace_existing=True,
    )
    # 16:30 açılış
    _scheduler.add_job(
        job_market_open_report,
        CronTrigger(day_of_week="mon-fri", hour=16, minute=30),
        id="market_open",
        replace_existing=True,
    )
    # 23:05 kapanış
    _scheduler.add_job(
        job_closing_report,
        CronTrigger(day_of_week="mon-fri", hour=23, minute=5),
        id="closing_report",
        replace_existing=True,
    )
    # Her 5 dk alarm
    _scheduler.add_job(
        job_alert_checks,
        CronTrigger(minute="*/5"),
        id="alert_checks",
        replace_existing=True,
    )
    # Her saat teknik
    _scheduler.add_job(
        job_refresh_technical,
        CronTrigger(minute=0),
        id="technical_refresh",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("APScheduler başlatıldı (Europe/Istanbul)")
    return _scheduler


def stop_scheduler():
    """Scheduler'ı durdurur."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler durduruldu")
    _scheduler = None
