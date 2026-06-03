"""Fiyat endpoint'leri."""

import logging

from fastapi import APIRouter, HTTPException

from backend.services import price_service
from backend.utils.json_store import read_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/all")
async def get_all_prices():
    """Portföydeki tüm sembol fiyatları."""
    try:
        portfolio = read_json(PORTFOLIO_FILE, default={})
        symbols = [p["symbol"] for p in portfolio.get("positions", [])]
        if not symbols:
            return {}
        return await price_service.get_prices(symbols)
    except Exception as e:
        logger.error("Tüm fiyatlar: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/{symbol}")
async def get_symbol_price(symbol: str):
    """Tek sembol fiyatı."""
    try:
        return await price_service.get_price(symbol)
    except Exception as e:
        logger.error("Fiyat %s: %s", symbol, e)
        raise HTTPException(502, detail=str(e))
