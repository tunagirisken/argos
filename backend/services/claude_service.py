"""Anthropic Claude — token optimize portföy asistanı."""

import logging
import os
from typing import Any

from anthropic import Anthropic

from backend.utils import formatters
from backend.utils.json_store import read_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS_REPORT = 400
MAX_TOKENS_CHAT = 600

COMPACT_SYSTEM = """
ARGOS portföy asistanı. Türkçe, kısa, net yanıt.
Portföy: {compact_portfolio}
Teknik: {compact_technical}
Haberler: {news_headlines_only}
Kural: Her yanıt max 3 paragraf. Sorumluluk reddi ekle.
"""


def _client() -> Anthropic | None:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        logger.warning("ANTHROPIC_API_KEY tanımlı değil")
        return None
    return Anthropic(api_key=key)


def _build_system(
    portfolio: dict,
    prices: dict | None,
    signals: dict | None,
    news: list | None,
) -> str:
    return COMPACT_SYSTEM.format(
        compact_portfolio=formatters.compact_portfolio(portfolio, prices),
        compact_technical=formatters.compact_technical(signals or {}),
        news_headlines_only=formatters.compact_news_headlines(news or []),
    )


def _call_claude(
    system: str,
    user_message: str,
    max_tokens: int = MAX_TOKENS_REPORT,
) -> str:
    """Claude API çağrısı."""
    client = _client()
    if not client:
        return "Claude API anahtarı yapılandırılmamış."

    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )
        parts = []
        for block in msg.content:
            if hasattr(block, "text"):
                parts.append(block.text)
        return "\n".join(parts) or "Yanıt alınamadı."
    except Exception as e:
        logger.error("Claude hatası: %s", e)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except ImportError:
            pass
        raise


async def morning_briefing(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Sabah brifing — günde 1x."""
    system = _build_system(portfolio, prices, signals, news)
    return _call_claude(
        system,
        "Sabah brifing: bugün portföy için öncelikli 3 madde ve dikkat edilecek riskler.",
        MAX_TOKENS_REPORT,
    )


async def closing_report(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Kapanış raporu — günde 1x."""
    system = _build_system(portfolio, prices, signals, news)
    return _call_claude(
        system,
        "Gün kapanış özeti: pozisyon durumu, stop/hedef yakınlığı, yarın için 2 aksiyon.",
        MAX_TOKENS_REPORT,
    )


async def analyze_portfolio(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Manuel portföy analizi."""
    system = _build_system(portfolio, prices, signals, news)
    return _call_claude(
        system,
        "Portföy analizi: dağılım, risk ve önerilen aksiyonlar.",
        MAX_TOKENS_REPORT,
    )


async def analyze_symbol(
    symbol: str,
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Tek sembol analizi."""
    system = _build_system(portfolio, prices, signals, news)
    return _call_claude(
        system,
        f"{symbol} pozisyonu için kısa analiz ve stop/hedef değerlendirmesi.",
        MAX_TOKENS_REPORT,
    )


async def chat(
    message: str,
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Kullanıcı sohbeti."""
    system = _build_system(portfolio, prices, signals, news)
    return _call_claude(system, message, MAX_TOKENS_CHAT)


async def stop_loss_alert_message(
    symbol: str,
    price: float,
    stop_loss: float,
    portfolio: dict,
) -> str:
    """Stop-loss ACİL — kısa Claude mesajı."""
    system = _build_system(portfolio, {symbol: {"price": price}}, {}, [])
    return _call_claude(
        system,
        f"ACİL: {symbol} fiyat ${price:.2f} stop ${stop_loss:.2f} altında. "
        "Max 2 cümle aksiyon önerisi.",
        150,
    )


def load_portfolio() -> dict:
    return read_json(PORTFOLIO_FILE, default={})
