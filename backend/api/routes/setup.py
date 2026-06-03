"""Kurulum sihirbazı endpoint'leri."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.utils.json_store import write_json
from backend.utils.paths import BACKEND_ROOT, DATA_DIR, PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/setup", tags=["setup"])

ENV_PATH = BACKEND_ROOT / ".env"
FLAG_PATH = DATA_DIR / ".setup_complete"


class EnvBody(BaseModel):
    anthropic_api_key: str
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
    return {
        "setup_complete": FLAG_PATH.exists(),
        "has_env": ENV_PATH.exists(),
        "has_portfolio": PORTFOLIO_FILE.exists(),
    }


@router.post("/env")
def post_env(body: EnvBody):
    try:
        lines = [
            "LOG_LEVEL=INFO",
            "ENV=development",
            f"ANTHROPIC_API_KEY={body.anthropic_api_key}",
            f"TELEGRAM_BOT_TOKEN={body.telegram_bot_token}",
            f"TELEGRAM_CHAT_ID={body.telegram_chat_id}",
        ]
        if body.firecrawl_api_key:
            lines.append(f"FIRECRAWL_API_KEY={body.firecrawl_api_key}")
        if body.exa_api_key:
            lines.append(f"EXA_API_KEY={body.exa_api_key}")
        if body.sentry_dsn:
            lines.append(f"SENTRY_DSN={body.sentry_dsn}")
        ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return {"ok": True}
    except Exception as e:
        logger.error("Setup env hatası: %s", e)
        raise HTTPException(500, detail=str(e))


@router.post("/portfolio")
def post_portfolio(body: PortfolioBody):
    try:
        positions = []
        for p in body.positions:
            stop, target = _auto_levels(p.avg_cost)
            positions.append(
                {
                    "symbol": p.symbol.upper(),
                    "name": p.name or p.symbol.upper(),
                    "shares": p.shares,
                    "avg_cost": p.avg_cost,
                    "stop_loss": stop,
                    "target": target,
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
