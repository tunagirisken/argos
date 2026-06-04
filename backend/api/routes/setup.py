"""Kurulum sihirbazı endpoint'leri."""

import logging
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services import analyst_target_service
from backend.utils.env_config import load_env, llm_configured
from backend.utils.json_store import write_json
from backend.utils.paths import BACKEND_ROOT, DATA_DIR, PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/setup", tags=["setup"])

ENV_PATH = BACKEND_ROOT / ".env"
FLAG_PATH = DATA_DIR / ".setup_complete"


class EnvBody(BaseModel):
    llm_provider: str = "gemini"
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    telegram_bot_token: str
    telegram_chat_id: str
    firecrawl_api_key: str | None = None
    exa_api_key: str | None = None
    sentry_dsn: str | None = None


class PositionIn(BaseModel):
    symbol: str
    shares: float
    avg_cost: float
    name: str = ""


class PendingOrderIn(BaseModel):
    symbol: str
    side: str
    price: float
    shares: float


class PortfolioBody(BaseModel):
    cash_usd: float = 0
    positions: list[PositionIn]
    pending_orders: list[PendingOrderIn] = []


def _auto_levels(avg_cost: float) -> tuple[float, float]:
    return round(avg_cost * 0.92, 2), round(avg_cost * 1.15, 2)


@router.get("/status")
def setup_status():
    load_env()
    return {
        "setup_complete": FLAG_PATH.exists(),
        "has_env": ENV_PATH.exists(),
        "has_portfolio": PORTFOLIO_FILE.exists(),
    }


@router.get("/integrations")
def integrations_status():
    """Cursor eklentileri / harici API durumu (anahtar var mı)."""
    load_env()
    return {
        "llm": llm_configured(),
        "telegram": bool((os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()),
        "firecrawl": bool((os.getenv("FIRECRAWL_API_KEY") or "").strip()),
        "exa": bool((os.getenv("EXA_API_KEY") or "").strip()),
        "sentry": bool((os.getenv("SENTRY_DSN") or "").strip()),
    }


@router.post("/env")
def post_env(body: EnvBody):
    provider = (body.llm_provider or "gemini").strip().lower()
    if provider not in ("anthropic", "gemini"):
        raise HTTPException(400, detail="llm_provider: anthropic veya gemini olmalı")
    if provider == "gemini" and not (body.gemini_api_key or "").strip():
        raise HTTPException(400, detail="Gemini API anahtarı gerekli")
    if provider == "anthropic" and not (body.anthropic_api_key or "").strip():
        raise HTTPException(400, detail="Anthropic API anahtarı gerekli")

    try:
        lines = [
            "LOG_LEVEL=INFO",
            "ENV=development",
            f"LLM_PROVIDER={provider}",
            f"TELEGRAM_BOT_TOKEN={body.telegram_bot_token}",
            f"TELEGRAM_CHAT_ID={body.telegram_chat_id}",
        ]
        if body.anthropic_api_key:
            lines.append(f"ANTHROPIC_API_KEY={body.anthropic_api_key.strip()}")
        if body.gemini_api_key:
            lines.append(f"GEMINI_API_KEY={body.gemini_api_key.strip()}")
        if body.firecrawl_api_key:
            lines.append(f"FIRECRAWL_API_KEY={body.firecrawl_api_key}")
        if body.exa_api_key:
            lines.append(f"EXA_API_KEY={body.exa_api_key}")
        if body.sentry_dsn:
            lines.append(f"SENTRY_DSN={body.sentry_dsn}")
        ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
        load_env()
        return {"ok": True}
    except Exception as e:
        logger.error("Setup env hatası: %s", e)
        raise HTTPException(500, detail=str(e))


@router.post("/portfolio")
async def post_portfolio(body: PortfolioBody):
    try:
        positions = []
        for p in body.positions:
            stop, fallback_target = _auto_levels(p.avg_cost)
            target = fallback_target
            try:
                info = await analyst_target_service.get_analyst_target(p.symbol)
                if info.get("recommended_target"):
                    target = info["recommended_target"]
            except Exception as e:
                logger.warning("Kurulum hedef %s: %s", p.symbol, e)
            positions.append(
                {
                    "symbol": p.symbol.upper(),
                    "name": p.name or p.symbol.upper(),
                    "shares": p.shares,
                    "avg_cost": p.avg_cost,
                    "stop_loss": stop,
                    "target": target,
                    "target_source": "analyst_consensus" if target != fallback_target else "auto_pct",
                    "note": "",
                }
            )
        data = {
            "last_updated": datetime.now().isoformat(timespec="seconds"),
            "cash_usd": body.cash_usd,
            "positions": positions,
            "pending_orders": [o.model_dump() for o in body.pending_orders],
        }
        write_json(PORTFOLIO_FILE, data)
        return {"ok": True}
    except Exception as e:
        logger.error("Setup portfolio hatası: %s", e)
        raise HTTPException(500, detail=str(e))


@router.post("/complete")
def setup_complete():
    try:
        FLAG_PATH.parent.mkdir(parents=True, exist_ok=True)
        FLAG_PATH.write_text("1", encoding="utf-8")
        return {"ok": True}
    except Exception as e:
        logger.error("Setup complete hatası: %s", e)
        raise HTTPException(500, detail=str(e))


@router.delete("/reset")
def setup_reset():
    if FLAG_PATH.exists():
        FLAG_PATH.unlink()
    return {"ok": True}
