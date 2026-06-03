"""Claude analiz endpoint'leri — manuel çağrı."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services import claude_service, news_service, price_service, technical_service
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
    """Manuel portföy analizi."""
    try:
        portfolio, prices, signals, news = await _gather_context()
        text = await claude_service.analyze_portfolio(portfolio, prices, signals, news)
        return {"analysis": text}
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
