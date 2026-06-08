"""İşlem motoru API."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import engine_service, portfolio_advisor_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engine", tags=["engine"])


class EngineConfigBody(BaseModel):
    mode: str | None = None
    risk_per_trade: float | None = Field(default=None, ge=0.5, le=5)
    max_positions: int | None = Field(default=None, ge=1, le=12)
    auto_telegram: bool | None = None


class StrategyBody(BaseModel):
    active: bool


class ApplyAdviceBody(BaseModel):
    symbols: list[str] | None = None


@router.get("/status")
def engine_status():
    return engine_service.get_status()


@router.post("/toggle")
def engine_toggle():
    return engine_service.toggle_running()


@router.put("/config")
def engine_config(body: EngineConfigBody):
    if body.mode and body.mode not in ("paper", "live"):
        raise HTTPException(400, detail="mode: paper veya live olmalı")
    return engine_service.update_config(body.model_dump(exclude_none=True))


@router.get("/strategies")
def engine_strategies():
    return {"strategies": engine_service.list_strategies()}


@router.put("/strategy/{strategy_id}")
def engine_strategy(strategy_id: str, body: StrategyBody):
    try:
        return engine_service.set_strategy_active(strategy_id, body.active)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.get("/trades")
def engine_trades():
    return {"trades": engine_service.list_trades()}


@router.get("/equity")
def engine_equity(days: int = 90):
    return {"equity": engine_service.get_equity(days=days)}


@router.get("/feed")
def engine_feed(limit: int = 20):
    return {"feed": engine_service.get_feed(limit=limit)}


@router.get("/portfolio-advice")
async def portfolio_advice():
    """Portföy stop/hedef ve işlem tavsiyeleri özeti."""
    try:
        return await portfolio_advisor_service.get_portfolio_advice()
    except Exception as e:
        logger.error("Portföy tavsiye: %s", e)
        raise HTTPException(500, detail=str(e))


@router.post("/portfolio-advice/apply")
async def apply_portfolio_advice(body: ApplyAdviceBody | None = None):
    """Önerilen stop/hedef değerlerini portföye yaz."""
    try:
        symbols = body.symbols if body else None
        return await portfolio_advisor_service.apply_advice(symbols)
    except Exception as e:
        logger.error("Tavsiye uygulama: %s", e)
        raise HTTPException(500, detail=str(e))
