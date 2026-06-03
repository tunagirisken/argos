"""Kullanıcı alarmları ve log endpoint'leri."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import alert_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    symbol: str
    condition: str = Field(description="price_above | price_below | price_equals")
    value: float
    message: str = ""
    enabled: bool = True


@router.get("/log")
async def get_alert_log(limit: int = 100):
    """Tetiklenen alarm geçmişi."""
    return alert_service.get_alert_log(limit=limit)


@router.get("")
async def list_alerts():
    """Kullanıcı tanımlı alarmlar."""
    return alert_service.list_custom_alerts()


@router.post("")
async def create_alert(body: AlertCreate):
    """Yeni alarm."""
    valid = {"price_above", "price_below", "price_equals"}
    if body.condition not in valid:
        raise HTTPException(400, detail=f"condition şunlardan biri olmalı: {valid}")
    try:
        return alert_service.create_custom_alert(body.model_dump())
    except Exception as e:
        logger.error("Alarm oluşturma: %s", e)
        raise HTTPException(500, detail=str(e))


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    """Alarm sil."""
    if not alert_service.delete_custom_alert(alert_id):
        raise HTTPException(404, detail="Alarm bulunamadı")
    return {"ok": True, "id": alert_id}
