"""Piyasa verisi — gerçek yfinance paketleri."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import market_data_service
from backend.utils.market_hours import is_us_market_hours, now_istanbul

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["market"])


@router.get("/hours")
def market_hours_status():
    """NYSE/NASDAQ açık mı — backend market_hours ile aynı mantık."""
    dt = now_istanbul()
    open_now = is_us_market_hours(dt)
    return {
        "open": open_now,
        "timezone": "Europe/Istanbul",
        "local_time": dt.strftime("%H:%M:%S"),
        "label": "NYSE AÇIK" if open_now else "NYSE KAPALI",
    }


class BundleRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=40)


@router.get("/{symbol}/bundle")
async def get_bundle(symbol: str):
    """Tek sembol: OHLCV grafik + indikatörler + sinyal."""
    try:
        return await market_data_service.get_market_bundle(symbol)
    except ValueError as e:
        raise HTTPException(404, detail=str(e))
    except Exception as e:
        logger.error("Market bundle %s: %s", symbol, e)
        raise HTTPException(502, detail=str(e))


@router.post("/bundle")
async def post_bundles(body: BundleRequest):
    """Portföy sembolleri için toplu paket."""
    try:
        bundles = await market_data_service.get_market_bundles(body.symbols)
        return {"bundles": bundles}
    except Exception as e:
        logger.error("Market bundles: %s", e)
        raise HTTPException(502, detail=str(e))


@router.post("/snapshot")
async def post_snapshots(body: BundleRequest):
    """Portföy sembolleri için hafif anlık fiyat + sinyal."""
    try:
        snapshots = await market_data_service.get_market_snapshots(body.symbols)
        return {"snapshots": snapshots}
    except Exception as e:
        logger.error("Market snapshots: %s", e)
        raise HTTPException(502, detail=str(e))
