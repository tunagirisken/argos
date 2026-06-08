"""Uygulama yapılandırma API."""

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services import app_config_service
from backend.utils.env_config import load_env, llm_configured

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/config", tags=["config"])


class LlmBody(BaseModel):
    provider: str


class NotificationsBody(BaseModel):
    price: bool | None = None
    stop: bool | None = None
    rsi: bool | None = None
    daily: bool | None = None
    news: bool | None = None


class SchedulerBody(BaseModel):
    morning: str | None = None
    close: str | None = None
    morning_on: bool | None = None
    close_on: bool | None = None


class PreferencesBody(BaseModel):
    currency: str | None = None
    timezone: str | None = None


@router.get("")
def get_app_config():
    load_env()
    cfg = app_config_service.get_config()
    return {
        **cfg,
        "integrations": {
            "llm": llm_configured(),
            "telegram": bool((os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()),
            "firecrawl": bool((os.getenv("FIRECRAWL_API_KEY") or "").strip()),
            "exa": bool((os.getenv("EXA_API_KEY") or "").strip()),
            "sentry": bool((os.getenv("SENTRY_DSN") or "").strip()),
        },
    }


@router.put("/llm")
def put_llm(body: LlmBody):
    try:
        return app_config_service.set_llm_provider(body.provider)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.put("/notifications")
def put_notifications(body: NotificationsBody):
    return app_config_service.set_notifications(body.model_dump(exclude_none=True))


@router.put("/scheduler")
def put_scheduler(body: SchedulerBody):
    return app_config_service.set_scheduler(body.model_dump(exclude_none=True))


@router.put("/preferences")
def put_preferences(body: PreferencesBody):
    return app_config_service.set_preferences(body.model_dump(exclude_none=True))


@router.post("/integrations/test/{service}")
def test_integration(service: str):
    load_env()
    ok = False
    msg = "Servis tanımlı değil"
    if service == "llm":
        ok = llm_configured()
        msg = "LLM bağlı" if ok else "API anahtarı eksik"
    elif service == "telegram":
        ok = bool((os.getenv("TELEGRAM_BOT_TOKEN") or "").strip() and (os.getenv("TELEGRAM_CHAT_ID") or "").strip())
        msg = "Telegram yapılandırıldı" if ok else "Token veya chat ID eksik"
    elif service == "firecrawl":
        ok = bool((os.getenv("FIRECRAWL_API_KEY") or "").strip())
        msg = "Firecrawl anahtarı mevcut" if ok else "Anahtar eksik"
    elif service == "exa":
        ok = bool((os.getenv("EXA_API_KEY") or "").strip())
        msg = "Exa anahtarı mevcut" if ok else "Anahtar eksik"
    elif service == "sentry":
        ok = bool((os.getenv("SENTRY_DSN") or "").strip())
        msg = "Sentry DSN mevcut" if ok else "DSN eksik"
    elif service == "anthropic":
        ok = bool((os.getenv("ANTHROPIC_API_KEY") or "").strip())
        msg = "Anthropic anahtarı mevcut" if ok else "Anahtar eksik"
    elif service == "gemini":
        ok = bool((os.getenv("GEMINI_API_KEY") or "").strip())
        msg = "Gemini anahtarı mevcut" if ok else "Anahtar eksik"
    else:
        raise HTTPException(404, detail="Bilinmeyen servis")
    return {"ok": ok, "service": service, "message": msg}
