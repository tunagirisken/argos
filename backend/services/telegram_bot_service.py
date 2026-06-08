"""Telegram komut botu — python-telegram-bot polling."""

import asyncio
import logging
import os
from typing import TYPE_CHECKING

from backend.utils.env_config import load_env

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from telegram.ext import Application

_app: "Application | None" = None

HELP_TEXT = """ARGOS Telegram komutları

/durum — Portföy özeti
/fiyat SEMBOL — Anlık fiyat
/sinyal SEMBOL — Teknik sinyal
/trade [SEMBOL] — Trade skoru (AL/SAT/İZLE); sembol yoksa portföy
/haber SEMBOL — Son haberler
/hedef [SEMBOL] — Analist hedef fiyat
/hedef_guncelle — Portföy hedeflerini senkronize et
/hedef_ayar SEMBOL FIYAT — Manuel hedef
/stop SEMBOL FIYAT — Stop-loss güncelle
/analiz — Portföy AI analizi
/alarmlar — Özel alarmlar
/help — Bu liste

Otomatik: 09:00 brifing, 16:30 açılış, 23:05 kapanış, 5 dk alarm + trade AL/SAT."""


def _allowed_chat(chat_id: int | None) -> bool:
    load_env()
    allowed = (os.getenv("TELEGRAM_CHAT_ID") or "").strip()
    if not allowed or chat_id is None:
        return False
    return str(chat_id) == allowed


def _parse_symbol(args: list[str]) -> str | None:
    if not args:
        return None
    return args[0].upper().strip()


async def _reply(update, text: str) -> None:
    if update.message:
        await update.message.reply_text(text[:4000])


async def cmd_start(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    await _reply(
        update,
        "👁 ARGOS bot aktif.\n\n" + HELP_TEXT,
    )


async def cmd_help(update, context) -> None:
    await cmd_start(update, context)


async def cmd_durum(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.services import price_service
    from backend.utils.json_store import read_json
    from backend.utils.paths import PORTFOLIO_FILE

    data = read_json(PORTFOLIO_FILE, default={})
    positions = data.get("positions", [])
    if not positions:
        await _reply(update, "Portföy boş.")
        return

    syms = [p["symbol"] for p in positions]
    prices = await price_service.get_prices(syms)
    lines = ["📊 Portföy", ""]
    for pos in positions:
        sym = pos["symbol"]
        pd = prices.get(sym, {})
        price = pd.get("price", 0)
        ch = pd.get("change_pct", 0)
        stop = pos.get("stop_loss")
        target = pos.get("target")
        lines.append(
            f"{sym} ${price:.2f} ({ch:+.1f}%)\n"
            f"  stop ${stop or 0:.2f} | hedef ${target or 0:.2f}"
        )
    cash = data.get("cash_usd", 0)
    lines.append(f"\nNakit: ${cash:.2f}")
    await _reply(update, "\n".join(lines))


async def cmd_fiyat(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    sym = _parse_symbol(context.args)
    if not sym:
        await _reply(update, "Kullanım: /fiyat NVDA")
        return
    from backend.services import price_service

    try:
        pd = await price_service.get_price(sym)
        await _reply(
            update,
            f"{sym} ${pd['price']:.2f} ({pd.get('change_pct', 0):+.2f}%)",
        )
    except Exception as e:
        await _reply(update, f"{sym} fiyat alınamadı: {e}")


async def cmd_sinyal(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    sym = _parse_symbol(context.args)
    if not sym:
        await _reply(update, "Kullanım: /sinyal MRVL")
        return
    from backend.services import technical_service

    try:
        sig = await technical_service.generate_signal(sym)
        reasons = ", ".join(sig.get("reasons", [])[:3])
        await _reply(
            update,
            f"{sym} → {sig.get('signal')} ({sig.get('confidence')}%)\n"
            f"Risk: {sig.get('risk_level')}\n{reasons}",
        )
    except Exception as e:
        await _reply(update, f"Sinyal hatası: {e}")


async def cmd_trade(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.services import trade_alert_service
    from backend.services.trade_signal_service import format_trade_signal_text
    from backend.utils.json_store import read_json
    from backend.utils.paths import PORTFOLIO_FILE

    sym = _parse_symbol(context.args)
    try:
        if sym:
            data = await trade_alert_service.get_trade_signal_for_symbol(sym)
            await _reply(update, format_trade_signal_text(data))
            return

        portfolio = read_json(PORTFOLIO_FILE, default={})
        positions = portfolio.get("positions", [])
        if not positions:
            await _reply(update, "Portföy boş.\nKullanım: /trade NVDA veya portföy ekleyin.")
            return

        lines = ["📈 Trade skorları (teknik %70 + haber %30)", ""]
        for pos in positions:
            psym = pos["symbol"]
            try:
                data = await trade_alert_service.get_trade_signal_for_symbol(psym)
                lines.append(format_trade_signal_text(data))
                lines.append("")
            except Exception as e:
                lines.append(f"{psym}: hata — {e}")
                lines.append("")
        await _reply(update, "\n".join(lines).strip())
    except Exception as e:
        await _reply(update, f"Trade skoru alınamadı: {e}")


async def cmd_haber(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    sym = _parse_symbol(context.args)
    if not sym:
        await _reply(update, "Kullanım: /haber NVDA")
        return
    from backend.services import news_service

    try:
        items = (await news_service.get_news_for_symbol(sym))[:5]
        if not items:
            await _reply(update, f"{sym} için haber yok.")
            return
        lines = [f"📰 {sym} haberler", ""]
        for it in items:
            lines.append(f"• {it.get('title', '')[:80]}")
        await _reply(update, "\n".join(lines))
    except Exception as e:
        await _reply(update, f"Haber hatası: {e}")


async def cmd_hedef(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.services import analyst_target_service

    sym = _parse_symbol(context.args)
    try:
        msg = await analyst_target_service.format_target_message(sym)
        await _reply(update, msg)
    except Exception as e:
        await _reply(update, f"Hedef hatası: {e}")


async def cmd_hedef_guncelle(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.services import analyst_target_service

    await _reply(update, "Hedefler güncelleniyor…")
    try:
        results = await analyst_target_service.sync_portfolio_targets(apply=True)
        lines = ["✅ Hedef senkronizasyonu", ""]
        for r in results:
            sym = r["symbol"]
            new = r.get("new_target")
            conf = r.get("confidence", "?")
            if new:
                lines.append(f"• {sym}: ${new:.2f} ({conf})")
            else:
                lines.append(f"• {sym}: güncellenemedi")
        await _reply(update, "\n".join(lines))
    except Exception as e:
        await _reply(update, f"Senkron hatası: {e}")


async def cmd_hedef_ayar(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    if len(context.args) < 2:
        await _reply(update, "Kullanım: /hedef_ayar NVDA 220")
        return
    sym = context.args[0].upper()
    try:
        price = float(context.args[1].replace(",", "."))
    except ValueError:
        await _reply(update, "Geçersiz fiyat.")
        return

    from backend.utils.json_store import read_json, write_json
    from backend.utils.paths import PORTFOLIO_FILE

    data = read_json(PORTFOLIO_FILE, default={})
    found = False
    for pos in data.get("positions", []):
        if pos["symbol"] == sym:
            pos["target"] = round(price, 2)
            pos["target_source"] = "manual"
            found = True
            break
    if not found:
        await _reply(update, f"{sym} portföyde yok.")
        return
    write_json(PORTFOLIO_FILE, data)
    await _reply(update, f"✅ {sym} hedef ${price:.2f} olarak kaydedildi.")


async def cmd_stop(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    if len(context.args) < 2:
        await _reply(update, "Kullanım: /stop NVDA 175.5")
        return
    sym = context.args[0].upper()
    try:
        price = float(context.args[1].replace(",", "."))
    except ValueError:
        await _reply(update, "Geçersiz fiyat.")
        return

    from backend.utils.json_store import read_json, write_json
    from backend.utils.paths import PORTFOLIO_FILE

    data = read_json(PORTFOLIO_FILE, default={})
    found = False
    for pos in data.get("positions", []):
        if pos["symbol"] == sym:
            pos["stop_loss"] = round(price, 2)
            found = True
            break
    if not found:
        await _reply(update, f"{sym} portföyde yok.")
        return
    write_json(PORTFOLIO_FILE, data)
    await _reply(update, f"✅ {sym} stop ${price:.2f}")


async def cmd_analiz(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.api.routes.analysis import _gather_context
    from backend.services import claude_service
    from backend.services.telegram_service import send_message
    from backend.utils.env_config import llm_configured

    if not llm_configured():
        await _reply(update, "LLM yapılandırılmamış.")
        return
    await _reply(update, "Analiz başladı, birkaç dakika sürebilir…")
    try:
        portfolio, prices, signals, news = await _gather_context()
        text = await claude_service.analyze_portfolio(portfolio, prices, signals, news)
        await send_message(f"📊 Telegram /analiz\n\n{text}")
        await _reply(update, f"Analiz tamamlandı ({len(text)} karakter). Detay sohbette.")
    except Exception as e:
        await _reply(update, f"Analiz hatası: {e}")


async def cmd_alarmlar(update, context) -> None:
    if not _allowed_chat(update.effective_chat.id if update.effective_chat else None):
        return
    from backend.utils.json_store import read_json
    from backend.utils.paths import ALERTS_FILE

    alerts = read_json(ALERTS_FILE, default=[])
    if not alerts:
        await _reply(update, "Tanımlı özel alarm yok.")
        return
    lines = ["🔔 Alarmlar", ""]
    for a in alerts[:15]:
        lines.append(
            f"• {a.get('symbol')} {a.get('type')} @ {a.get('level', a.get('value', '?'))}"
        )
    await _reply(update, "\n".join(lines))


def _build_application() -> "Application | None":
    load_env()
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        return None

    from telegram.ext import Application, CommandHandler

    app = (
        Application.builder()
        .token(token)
        .connect_timeout(15.0)
        .read_timeout(15.0)
        .build()
    )
    handlers = [
        ("start", cmd_start),
        ("help", cmd_help),
        ("durum", cmd_durum),
        ("fiyat", cmd_fiyat),
        ("sinyal", cmd_sinyal),
        ("trade", cmd_trade),
        ("haber", cmd_haber),
        ("hedef", cmd_hedef),
        ("hedef_guncelle", cmd_hedef_guncelle),
        ("hedef_ayar", cmd_hedef_ayar),
        ("stop", cmd_stop),
        ("analiz", cmd_analiz),
        ("alarmlar", cmd_alarmlar),
    ]
    for name, fn in handlers:
        app.add_handler(CommandHandler(name, fn))
    return app


async def start_bot() -> None:
    """Polling botunu başlat; Telegram erişilemezse API yine açılır."""
    global _app
    if _app is not None:
        return
    load_env()
    if (os.getenv("TELEGRAM_BOT_ENABLED") or "true").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    ):
        logger.info("Telegram bot: TELEGRAM_BOT_ENABLED=false, atlandı")
        return
    app = _build_application()
    if not app:
        logger.info("Telegram bot: token yok, komut dinleyici kapalı")
        return
    try:
        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)
        _app = app
        logger.info("Telegram komut botu polling başladı")
    except Exception as e:
        logger.warning(
            "Telegram bot başlatılamadı (%s). Backend çalışmaya devam ediyor; "
            "komut botu kapalı. Ağ/VPN veya TELEGRAM_BOT_ENABLED=false deneyin.",
            e,
        )
        try:
            await app.shutdown()
        except Exception:
            pass


async def stop_bot() -> None:
    """Botu durdur — uzun polling beklemesini kısalt."""
    global _app
    if _app is None:
        return
    try:
        if _app.updater.running:
            await asyncio.wait_for(_app.updater.stop(), timeout=3.0)
        await asyncio.wait_for(_app.stop(), timeout=3.0)
        await asyncio.wait_for(_app.shutdown(), timeout=3.0)
    except Exception as e:
        logger.warning("Telegram bot kapanış: %s", e)
    _app = None
    logger.info("Telegram komut botu durduruldu")


def get_command_catalog() -> list[dict[str, str]]:
    """API / dokümantasyon için komut listesi."""
    return [
        {"command": "/start", "description": "Hoş geldin ve komut özeti", "example": "/start"},
        {"command": "/help", "description": "Komut listesi", "example": "/help"},
        {"command": "/durum", "description": "Portföy özeti", "example": "/durum"},
        {"command": "/fiyat", "description": "Anlık fiyat", "example": "/fiyat NVDA"},
        {"command": "/sinyal", "description": "Teknik sinyal", "example": "/sinyal MRVL"},
        {"command": "/trade", "description": "Trade skoru (tek sembol veya portföy)", "example": "/trade NVDA"},
        {"command": "/haber", "description": "Son haberler", "example": "/haber AVAV"},
        {"command": "/hedef", "description": "Analist hedef (tüm portföy veya sembol)", "example": "/hedef NVDA"},
        {"command": "/hedef_guncelle", "description": "Portföy hedeflerini web+yfinance ile güncelle", "example": "/hedef_guncelle"},
        {"command": "/hedef_ayar", "description": "Manuel hedef", "example": "/hedef_ayar NVDA 220"},
        {"command": "/stop", "description": "Stop-loss güncelle", "example": "/stop NVDA 175"},
        {"command": "/analiz", "description": "Portföy AI analizi", "example": "/analiz"},
        {"command": "/alarmlar", "description": "Özel alarmlar", "example": "/alarmlar"},
    ]
