"""Teknik analiz endpoint'leri."""

import logging

from fastapi import APIRouter, HTTPException

from backend.services import technical_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/technical", tags=["technical"])


@router.get("/{symbol}/signal")
async def get_signal(symbol: str):
    """Sinyal formatı."""
    try:
        return await technical_service.generate_signal(symbol)
    except Exception as e:
        logger.error("Sinyal %s: %s", symbol, e)
        raise HTTPException(502, detail=str(e))


@router.get("/{symbol}")
async def get_indicators(symbol: str):
    """Ham indikatörler."""
    try:
        return await technical_service.compute_indicators(symbol)
    except Exception as e:
        logger.error("Teknik %s: %s", symbol, e)
        raise HTTPException(502, detail=str(e))
