"""İzleme listesi — portföy dışı semboller. Yatırım tavsiyesi değildir."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import price_service, technical_service, trade_signal_service
from backend.utils.json_store import read_json, write_json
from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/watchlist", tags=["watchlist"])

WATCHLIST_FILE = DATA_DIR / "watchlist.json"


def _load() -> dict:
    data = read_json(WATCHLIST_FILE, default={"symbols": []})
    data.setdefault("symbols", [])
    return data


def _save(data: dict) -> None:
    write_json(WATCHLIST_FILE, data)


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    note: str = ""


@router.get("")
def get_watchlist():
    return _load()


@router.post("")
def add_watchlist(body: WatchlistAdd):
    sym = body.symbol.strip().upper()
    data = _load()
    if any(s.get("symbol") == sym for s in data["symbols"]):
        raise HTTPException(409, detail=f"{sym} zaten izleme listesinde")
    data["symbols"].append(
        {
            "symbol": sym,
            "note": body.note.strip(),
            "added_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    _save(data)
    return {"ok": True, "symbol": sym}


@router.delete("/{symbol}")
def remove_watchlist(symbol: str):
    sym = symbol.upper()
    data = _load()
    before = len(data["symbols"])
    data["symbols"] = [s for s in data["symbols"] if s.get("symbol") != sym]
    if len(data["symbols"]) == before:
        raise HTTPException(404, detail=f"{sym} bulunamadı")
    _save(data)
    return {"ok": True, "symbol": sym}


@router.get("/signals")
async def watchlist_signals():
    """Hafif skor — LLM yok."""
    data = _load()
    out = []
    for entry in data.get("symbols", []):
        sym = entry.get("symbol")
        if not sym:
            continue
        try:
            ind = await technical_service.compute_indicators(sym)
            price_data = await price_service.get_price(sym)
            sig = await technical_service.generate_signal(sym)
            trade = trade_signal_service.calculate_trade_score(
                sym, ind, None, price_data.get("change_pct")
            )
            out.append(
                {
                    "symbol": sym,
                    "note": entry.get("note", ""),
                    "price": price_data.get("price"),
                    "change_pct": price_data.get("change_pct"),
                    "rsi": ind.get("rsi"),
                    "signal": sig.get("signal"),
                    "trade_score": trade.get("score_display"),
                    "trade_decision": trade.get("decision"),
                }
            )
        except Exception as e:
            logger.warning("Watchlist sinyal %s: %s", sym, e)
            out.append({"symbol": sym, "error": str(e)})
    return {"signals": out, "count": len(out)}
