"""Telegram Bot API — async bildirimler."""

import logging
import os

import aiohttp

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


async def send_message(text: str, parse_mode: str | None = None) -> bool:
    """Telegram'a mesaj gönderir. Başarısızsa False."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        logger.debug("Telegram yapılandırılmamış, mesaj atlandı")
        return False

    # Telegram mesaj limiti
    if len(text) > 4000:
        text = text[:3990] + "\n…"

    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode

    url = TELEGRAM_API.format(token=token)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error("Telegram hatası %s: %s", resp.status, body)
                    return False
                return True
    except Exception as e:
        logger.error("Telegram gönderim hatası: %s", e)
        return False


async def notify_error(context: str, error: str) -> None:
    """Kritik hata bildirimi."""
    await send_message(f"⚠️ ARGOS Hata\n{context}\n{error[:500]}")
