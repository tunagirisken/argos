"""Keşif (fırsat tarama) API."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services import discovery_service
from backend.services.telegram_service import send_message
from backend.utils import formatters
from backend.utils.json_store import read_json
from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/discovery", tags=["discovery"])

LAST_DISCOVERY_FILE = DATA_DIR / "last_discovery.json"


class ScanBody(BaseModel):
    force: bool = False
    send_telegram: bool = True


@router.post("/scan")
async def discovery_scan(body: ScanBody | None = None):
    """Manuel keşif taraması."""
    body = body or ScanBody()
    try:
        result = await discovery_service.run_discovery(force=body.force)
        sent = False
        if body.send_telegram:
            sent = await send_message(formatters.format_discovery_report(result))
        return {"ok": True, "telegram_sent": sent, **result}
    except Exception as e:
        logger.exception("Keşif scan: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/latest")
def discovery_latest():
    """Son kayıtlı keşif raporu."""
    if not LAST_DISCOVERY_FILE.is_file():
        raise HTTPException(404, detail="Henüz keşif raporu yok. POST /discovery/scan çalıştırın.")
    return read_json(LAST_DISCOVERY_FILE, default={})
