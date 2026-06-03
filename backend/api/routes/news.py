"""Haber endpoint'leri — yalnızca başlık+URL+tarih."""

import logging

from fastapi import APIRouter, HTTPException

from backend.services import news_service
from backend.utils.json_store import read_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/news", tags=["news"])


def _symbols() -> list[str]:
    portfolio = read_json(PORTFOLIO_FILE, default={})
    return [p["symbol"] for p in portfolio.get("positions", [])]


@router.get("/portfolio")
async def get_portfolio_news():
    """Tüm portföy haberleri."""
    try:
        return await news_service.get_portfolio_news(_symbols())
    except Exception as e:
        logger.error("Portföy haberleri: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/{symbol}")
async def get_symbol_news(symbol: str):
    """Tek sembol haberleri."""
    try:
        return await news_service.get_news_for_symbol(symbol)
    except Exception as e:
        logger.error("Haber %s: %s", symbol, e)
        return []
