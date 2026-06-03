"""WebSocket — canlı fiyat yayını (60s, piyasa saatlerinde)."""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services import price_service
from backend.utils.json_store import read_json
from backend.utils.market_hours import is_us_market_hours
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Aktif WebSocket bağlantıları."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


def _portfolio_symbols() -> list[str]:
    portfolio = read_json(PORTFOLIO_FILE, default={})
    return [p["symbol"] for p in portfolio.get("positions", [])]


async def _fetch_prices_payload() -> dict:
    symbols = _portfolio_symbols()
    if not symbols:
        return {"type": "prices", "data": {}, "market_open": is_us_market_hours()}
    prices = await price_service.get_prices(symbols)
    return {
        "type": "prices",
        "data": prices,
        "market_open": is_us_market_hours(),
    }


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """Bağlantıda snapshot, sonra 60s broadcast."""
    await manager.connect(websocket)
    try:
        payload = await _fetch_prices_payload()
        await websocket.send_json(payload)

        while True:
            await asyncio.sleep(60)
            if is_us_market_hours():
                payload = await _fetch_prices_payload()
                await websocket.send_json(payload)
            else:
                await websocket.send_json(
                    {"type": "heartbeat", "market_open": False}
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket hatası: %s", e)
        manager.disconnect(websocket)


async def broadcast_loop():
    """Tüm bağlı istemcilere periyodik yayın (opsiyonel, WS handler yeterli)."""
    while True:
        await asyncio.sleep(60)
        if manager.active and is_us_market_hours():
            try:
                payload = await _fetch_prices_payload()
                await manager.broadcast(payload)
            except Exception as e:
                logger.warning("Broadcast hatası: %s", e)
