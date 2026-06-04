"""Claude analiz endpoint'leri — manuel çağrı."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services import (
    claude_service,
    news_service,
    price_service,
    technical_service,
    trade_alert_service,
)
from backend.services.telegram_service import send_message
from backend.utils.env_config import llm_configured, load_env
from backend.utils.json_store import read_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


class ChatRequest(BaseModel):
    message: str


async def _gather_context(symbols: list[str] | None = None) -> tuple:
    portfolio = read_json(PORTFOLIO_FILE, default={})
    syms = symbols or [p["symbol"] for p in portfolio.get("positions", [])]
    prices = await price_service.get_prices(syms)
    signals = {}
    all_news = []
    for sym in syms:
        try:
            signals[sym] = await technical_service.generate_signal(sym)
        except Exception:
            pass
        try:
            all_news.extend(await news_service.get_news_for_symbol(sym))
        except Exception:
            pass
    return portfolio, prices, signals, all_news


@router.post("/portfolio")
async def analyze_portfolio():
    """Manuel portföy analizi — yanıt JSON + Telegram bildirimi."""
    load_env()
    if not llm_configured():
        raise HTTPException(
            503,
            detail=(
                "LLM yapılandırılmamış. Setup wizard ile backend/.env dosyasını doldurun "
                "(LLM_PROVIDER=gemini, GEMINI_API_KEY=...). Ardından backend'i yeniden başlatın."
            ),
        )
    try:
        portfolio, prices, signals, news = await _gather_context()
        text = await claude_service.analyze_portfolio(portfolio, prices, signals, news)
        logger.info(
            "Portföy analizi tamamlandı (%s karakter):\n%s",
            len(text),
            text,
        )
        if text.startswith("LLM API"):
            raise HTTPException(503, detail=text)
        sent = await send_message(f"📊 ARGOS Portföy Analizi\n\n{text}")
        return {"analysis": text, "telegram_sent": sent}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Portföy analizi: %s", e)
        raise HTTPException(500, detail=str(e))


@router.post("/chat")
async def analysis_chat(body: ChatRequest):
    """Sohbet analizi."""
    try:
        portfolio, prices, signals, news = await _gather_context()
        text = await claude_service.chat(body.message, portfolio, prices, signals, news)
        return {"response": text}
    except Exception as e:
        logger.error("Chat analizi: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/trade-signals/portfolio")
async def trade_signals_portfolio():
    """Portföydeki tüm hisseler için trade skoru."""
    try:
        signals = await trade_alert_service.get_trade_signals_for_portfolio()
        return {"signals": signals, "count": len(signals)}
    except Exception as e:
        logger.error("Trade portföy skorları: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/trade-signal/{symbol}")
async def trade_signal(symbol: str):
    """Anlık trade skoru (teknik + haber)."""
    try:
        return await trade_alert_service.get_trade_signal_for_symbol(symbol.upper())
    except Exception as e:
        logger.error("Trade sinyal %s: %s", symbol, e)
        raise HTTPException(500, detail=str(e))


@router.get("/{symbol}")
async def analyze_symbol(symbol: str):
    """Tek sembol analizi."""
    try:
        sym = symbol.upper()
        portfolio, prices, signals, news = await _gather_context([sym])
        text = await claude_service.analyze_symbol(sym, portfolio, prices, signals, news)
        return {"symbol": sym, "analysis": text}
    except Exception as e:
        logger.error("Sembol analizi %s: %s", symbol, e)
        raise HTTPException(500, detail=str(e))
