"""Telegram Bot API — async bildirimler."""

import asyncio
import logging
import os

import aiohttp

from backend.utils.env_config import load_env

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
CHUNK_LIMIT = 4000
CHUNK_DELAY_SEC = 0.3


def split_message(text: str, limit: int = CHUNK_LIMIT) -> list[str]:
    """Uzun metni önce çift satır, sonra tek satır sınırından böl."""
    if len(text) <= limit:
        return [text]
    parts: list[str] = []
    rest = text
    while rest:
        if len(rest) <= limit:
            parts.append(rest)
            break
        window = rest[:limit]
        cut = window.rfind("\n\n")
        if cut < limit // 3:
            cut = window.rfind("\n")
        if cut < limit // 3:
            cut = limit
        parts.append(rest[:cut].rstrip())
        rest = rest[cut:].lstrip("\n")
    return parts


async def _send_one(
    text: str,
    token: str,
    chat_id: str,
    parse_mode: str | None,
    session: aiohttp.ClientSession,
) -> bool:
    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    url = TELEGRAM_API.format(token=token)
    try:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("Telegram hatası %s: %s", resp.status, body)
                return False
            return True
    except Exception as e:
        logger.error("Telegram parça gönderim hatası: %s", e)
        return False


async def send_message(text: str, parse_mode: str | None = None) -> bool:
    """Telegram'a mesaj gönderir; uzun metin parçalı, arada kısa bekleme."""
    load_env()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        logger.debug("Telegram yapılandırılmamış, mesaj atlandı")
        return False

    chunks = split_message(text, CHUNK_LIMIT)
    try:
        async with aiohttp.ClientSession() as session:
            ok = True
            for i, chunk in enumerate(chunks):
                if i > 0:
                    await asyncio.sleep(CHUNK_DELAY_SEC)
                if not await _send_one(chunk, token, chat_id, parse_mode, session):
                    ok = False
            return ok
    except Exception as e:
        logger.error("Telegram gönderim hatası: %s", e)
        return False


async def notify_error(context: str, error: str) -> None:
    """Kritik hata bildirimi."""
    await send_message(f"⚠️ ARGOS Hata\n{context}\n{error[:500]}")
