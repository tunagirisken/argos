"""Hisse sembol arama API."""

from fastapi import APIRouter, Query

from backend.services import symbol_search_service

router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("/search")
def search_symbols(
    q: str = Query("", min_length=0, max_length=32),
    limit: int = Query(40, ge=1, le=80),
):
    """Nasdaq sembol autocomplete."""
    return {
        "query": q,
        "results": symbol_search_service.search_symbols(q, limit=limit),
        "total": len(symbol_search_service.ensure_symbols_loaded()),
    }


@router.post("/refresh")
def refresh_symbol_cache():
    """Sembol listesini nasdaqtrader'dan yeniden indir."""
    data = symbol_search_service.refresh_symbol_cache()
    return {"ok": True, "count": len(data)}
