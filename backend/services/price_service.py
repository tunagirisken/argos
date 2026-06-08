"""yfinance ile fiyat verisi — cache, retry, async."""

import asyncio
import logging
import time
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

CACHE_TTL = 60
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0

_cache: dict[str, tuple[float, dict]] = {}


def _is_permanent_price_error(exc: Exception) -> bool:
    """Yeniden denemenin faydası olmayan hatalar (delist, boş yfinance yanıtı)."""
    msg = str(exc).lower()
    return any(
        k in msg
        for k in (
            "exchangetimezonename",
            "delisted",
            "no price data",
            "fiyat alınamadı",
            "yeterli veri yok",
        )
    )


def _fetch_price_sync(symbol: str) -> dict[str, Any]:
    """Tek sembol fiyatını senkron çeker."""
    sym = symbol.upper()
    ticker = yf.Ticker(sym)
    price = None
    change_pct = 0.0

    try:
        info = ticker.fast_info
        price = getattr(info, "last_price", None) or getattr(info, "lastPrice", None)
        if hasattr(info, "regular_market_change_percent"):
            ch = info.regular_market_change_percent
            if ch is not None:
                change_pct = float(ch)
    except (KeyError, AttributeError, TypeError) as e:
        logger.debug("fast_info atlandı %s: %s", sym, e)

    hist = ticker.history(period="5d")
    if price is None and not hist.empty:
        price = float(hist["Close"].iloc[-1])

    if price is None:
        raise ValueError(f"{sym} için fiyat alınamadı")

    if not hist.empty and len(hist) >= 2:
        prev = float(hist["Close"].iloc[-2])
        curr = float(hist["Close"].iloc[-1])
        if prev:
            change_pct = ((curr - prev) / prev) * 100

    return {
        "symbol": symbol.upper(),
        "price": round(float(price), 2),
        "change_pct": round(change_pct, 2),
        "currency": "USD",
        "timestamp": time.time(),
    }


def _get_cached(symbol: str) -> dict | None:
    key = symbol.upper()
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _set_cache(symbol: str, data: dict) -> None:
    _cache[symbol.upper()] = (time.time(), data)


async def get_price(symbol: str, use_cache: bool = True) -> dict[str, Any]:
    """Sembol fiyatı — 3 deneme, exponential backoff."""
    sym = symbol.upper()
    if use_cache:
        cached = _get_cached(sym)
        if cached:
            return cached

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            data = await asyncio.to_thread(_fetch_price_sync, sym)
            _set_cache(sym, data)
            return data
        except Exception as e:
            last_error = e
            logger.warning(
                "Fiyat hatası %s (deneme %d/%d): %s",
                sym,
                attempt + 1,
                MAX_RETRIES,
                e,
            )
            if _is_permanent_price_error(e):
                break
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (2**attempt)
                await asyncio.sleep(delay)

    logger.error("Fiyat alınamadı %s: %s", sym, last_error)
    try:
        from backend.services.telegram_service import notify_error
        await notify_error(f"Fiyat servisi {sym}", str(last_error))
    except Exception:
        pass
    try:
        import sentry_sdk
        if last_error:
            sentry_sdk.capture_exception(last_error)
    except ImportError:
        pass
    raise last_error or RuntimeError(f"{sym} fiyat hatası")


async def get_prices(symbols: list[str]) -> dict[str, dict]:
    """Birden fazla sembol için fiyat."""
    result = {}
    for sym in symbols:
        try:
            result[sym.upper()] = await get_price(sym)
        except Exception as e:
            logger.error("Toplu fiyat hatası %s: %s", sym, e)
            result[sym.upper()] = {"symbol": sym.upper(), "error": str(e)}
    return result


def clear_cache() -> None:
    """Önbelleği temizler."""
    _cache.clear()
