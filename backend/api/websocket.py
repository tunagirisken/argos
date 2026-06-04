"""WebSocket — canlı piyasa yayını (60s, piyasa saatlerinde)."""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services import market_data_service, trade_alert_service
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


async def _fetch_market_payload() -> dict:
    """Fiyat + teknik sinyal + trade skorları — portföy geneli."""
    symbols = _portfolio_symbols()
    market_open = is_us_market_hours()
    if not symbols:
        return {"type": "market", "data": {}, "trade_signals": [], "market_open": market_open}

    snapshots, trade_signals = await asyncio.gather(
        market_data_service.get_market_snapshots(symbols),
        trade_alert_service.get_trade_signals_for_portfolio(),
    )
    return {
        "type": "market",
        "data": snapshots,
        "trade_signals": trade_signals,
        "market_open": market_open,
    }


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """Bağlantıda snapshot, sonra 60s güncelleme (piyasa açıkken)."""
    await manager.connect(websocket)
    try:
        payload = await _fetch_market_payload()
        await websocket.send_json(payload)

        while True:
            await asyncio.sleep(60)
            if is_us_market_hours():
                payload = await _fetch_market_payload()
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
