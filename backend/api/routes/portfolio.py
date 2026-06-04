"""Portföy CRUD endpoint'leri."""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services import analyst_target_service, price_service
from backend.utils.json_store import read_json, write_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class PositionCreate(BaseModel):
    symbol: str
    name: str = ""
    shares: float = Field(gt=0)
    avg_cost: float = Field(gt=0)
    stop_loss: float | None = None
    stop_loss_shares: float | None = None
    target: float | None = None
    note: str = ""


class PositionUpdate(BaseModel):
    name: str | None = None
    shares: float | None = None
    avg_cost: float | None = None
    stop_loss: float | None = None
    stop_loss_shares: float | None = None
    target: float | None = None
    note: str | None = None


def _load() -> dict:
    return read_json(PORTFOLIO_FILE, default={"positions": [], "cash_usd": 0})


def _save(data: dict) -> None:
    data["last_updated"] = datetime.now().isoformat(timespec="seconds")
    write_json(PORTFOLIO_FILE, data)


async def _enrich_portfolio(data: dict) -> dict:
    """Canlı fiyatlarla zenginleştir."""
    symbols = [p["symbol"] for p in data.get("positions", [])]
    prices = await price_service.get_prices(symbols)
    enriched = []
    for pos in data.get("positions", []):
        sym = pos["symbol"]
        p = prices.get(sym, {})
        ep = {**pos}
        if "price" in p:
            ep["current_price"] = p["price"]
            ep["change_pct"] = p.get("change_pct", 0)
            ep["market_value"] = round(p["price"] * pos["shares"], 2)
            ep["unrealized_pl"] = round(
                (p["price"] - pos["avg_cost"]) * pos["shares"], 2
            )
            ep["unrealized_pl_pct"] = round(
                ((p["price"] - pos["avg_cost"]) / pos["avg_cost"]) * 100, 2
            )
        enriched.append(ep)
    return {**data, "positions": enriched, "live_prices": prices}


@router.get("")
async def get_portfolio() -> dict[str, Any]:
    """Portföy + canlı fiyatlar."""
    try:
        data = _load()
        return await _enrich_portfolio(data)
    except Exception as e:
        logger.error("Portföy okuma: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/summary")
async def get_summary() -> dict[str, Any]:
    """Toplam değer, P/L özeti."""
    try:
        data = await _enrich_portfolio(_load())
        cash = data.get("cash_usd", 0)
        total_value = cash
        total_cost = 0
        total_pl = 0
        day_pl = 0
        for pos in data.get("positions", []):
            mv = pos.get("market_value", pos["shares"] * pos["avg_cost"])
            cost = pos["shares"] * pos["avg_cost"]
            total_value += mv
            total_cost += cost
            total_pl += pos.get("unrealized_pl", 0)
            ch = float(pos.get("change_pct") or 0)
            if ch:
                day_pl += mv * (ch / (100 + ch))

        prev_value = total_value - day_pl
        return {
            "cash_usd": cash,
            "positions_count": len(data.get("positions", [])),
            "total_market_value": round(total_value, 2),
            "total_cost_basis": round(total_cost, 2),
            "total_unrealized_pl": round(total_pl, 2),
            "total_unrealized_pl_pct": round(
                (total_pl / total_cost * 100) if total_cost else 0, 2
            ),
            "day_pl": round(day_pl, 2),
            "day_pl_pct": round((day_pl / prev_value * 100) if prev_value else 0, 2),
            "last_updated": data.get("last_updated"),
        }
    except Exception as e:
        logger.error("Özet hatası: %s", e)
        raise HTTPException(500, detail=str(e))


def _auto_levels(avg_cost: float) -> tuple[float, float]:
    return round(avg_cost * 0.92, 2), round(avg_cost * 1.15, 2)


@router.post("/position")
async def add_position(body: PositionCreate) -> dict:
    """Yeni pozisyon ekle."""
    try:
        data = _load()
        sym = body.symbol.upper()
        if any(p["symbol"] == sym for p in data.get("positions", [])):
            raise HTTPException(400, detail=f"{sym} zaten portföyde")

        stop_loss, fallback_target = _auto_levels(body.avg_cost)
        if body.stop_loss is not None:
            stop_loss = body.stop_loss
        target = body.target if body.target is not None else fallback_target
        if body.target is None:
            try:
                info = await analyst_target_service.get_analyst_target(sym)
                if info.get("recommended_target"):
                    target = info["recommended_target"]
            except Exception as e:
                logger.warning("Pozisyon hedef %s: %s", sym, e)

        data.setdefault("positions", []).append(
            {
                "symbol": sym,
                "name": body.name or sym,
                "shares": body.shares,
                "avg_cost": body.avg_cost,
                "stop_loss": stop_loss,
                "stop_loss_shares": body.stop_loss_shares,
                "target": target,
                "target_source": "analyst_consensus" if target != fallback_target else "auto_pct",
                "note": body.note,
            }
        )
        _save(data)
        return {"ok": True, "symbol": sym, "stop_loss": stop_loss, "target": target}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pozisyon ekleme: %s", e)
        raise HTTPException(500, detail=str(e))


@router.put("/position/{symbol}")
async def update_position(symbol: str, body: PositionUpdate) -> dict:
    """Pozisyon güncelle."""
    try:
        data = _load()
        sym = symbol.upper()
        found = False
        for pos in data.get("positions", []):
            if pos["symbol"] == sym:
                updates = body.model_dump(exclude_none=True)
                pos.update(updates)
                found = True
                break
        if not found:
            raise HTTPException(404, detail=f"{sym} bulunamadı")
        _save(data)
        return {"ok": True, "symbol": sym}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pozisyon güncelleme: %s", e)
        raise HTTPException(500, detail=str(e))


@router.get("/targets/{symbol}")
async def get_position_target(symbol: str) -> dict:
    """Tek sembol analist hedef özeti."""
    try:
        return await analyst_target_service.get_analyst_target(symbol.upper())
    except Exception as e:
        logger.error("Hedef okuma %s: %s", symbol, e)
        raise HTTPException(500, detail=str(e))


@router.post("/sync-targets")
async def sync_targets(apply: bool = True) -> dict:
    """Portföy hedef fiyatlarını analist konsensüsü ile güncelle."""
    try:
        results = await analyst_target_service.sync_portfolio_targets(apply=apply)
        return {"ok": True, "results": results}
    except Exception as e:
        logger.error("Hedef senkron: %s", e)
        raise HTTPException(500, detail=str(e))


@router.delete("/position/{symbol}")
async def delete_position(symbol: str) -> dict:
    """Pozisyon sil."""
    try:
        data = _load()
        sym = symbol.upper()
        before = len(data.get("positions", []))
        data["positions"] = [p for p in data.get("positions", []) if p["symbol"] != sym]
        if len(data["positions"]) == before:
            raise HTTPException(404, detail=f"{sym} bulunamadı")
        _save(data)
        return {"ok": True, "symbol": sym}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pozisyon silme: %s", e)
        raise HTTPException(500, detail=str(e))
