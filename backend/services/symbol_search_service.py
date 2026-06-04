"""Nasdaq hisse arama — nasdaqtrader sembol dizini."""

import logging
import re
from pathlib import Path
from typing import Any
from urllib.request import urlopen

from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)

SYMBOLS_FILE = DATA_DIR / "nasdaq_symbols.json"
NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt"

_cache: list[dict[str, str]] | None = None


def _fetch_nasdaq_listed() -> list[dict[str, str]]:
    """Nasdaq listed.txt → sembol listesi."""
    out: list[dict[str, str]] = []
    with urlopen(NASDAQ_LISTED_URL, timeout=30) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    for line in text.splitlines():
        if not line or line.startswith("Symbol") or line.startswith("File Creation"):
            continue
        parts = line.split("|")
        if len(parts) < 2:
            continue
        sym = parts[0].strip().upper()
        name = parts[1].strip()
        test_issue = parts[6].strip().upper() if len(parts) > 6 else "N"
        if not sym or sym == "Symbol" or test_issue == "Y":
            continue
        if not re.match(r"^[A-Z][A-Z0-9.\-]{0,9}$", sym):
            continue
        out.append(
            {
                "symbol": sym,
                "name": name,
                "exchange": "NASDAQ",
            }
        )
    return out


def _load_from_disk() -> list[dict[str, str]] | None:
    if not SYMBOLS_FILE.is_file():
        return None
    import json

    data = json.loads(SYMBOLS_FILE.read_text(encoding="utf-8"))
    if isinstance(data, list) and data:
        return data
    return None


def _save_to_disk(symbols: list[dict[str, str]]) -> None:
    import json

    SYMBOLS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SYMBOLS_FILE.write_text(json.dumps(symbols, ensure_ascii=False), encoding="utf-8")


def ensure_symbols_loaded() -> list[dict[str, str]]:
    """Bellek önbelleği; dosya veya nasdaqtrader."""
    global _cache
    if _cache is not None:
        return _cache

    disk = _load_from_disk()
    if disk:
        _cache = disk
        logger.info("Nasdaq sembolleri yüklendi (dosya): %d", len(_cache))
        return _cache

    try:
        _cache = _fetch_nasdaq_listed()
        _save_to_disk(_cache)
        logger.info("Nasdaq sembolleri indirildi: %d", len(_cache))
    except Exception as e:
        logger.error("Nasdaq sembol indirme hatası: %s", e)
        _cache = _fallback_symbols()
    return _cache


def _fallback_symbols() -> list[dict[str, str]]:
    """Ağ yoksa minimal liste."""
    common = [
        ("AAPL", "Apple Inc."),
        ("MSFT", "Microsoft Corporation"),
        ("NVDA", "NVIDIA Corporation"),
        ("AMZN", "Amazon.com Inc."),
        ("META", "Meta Platforms Inc."),
        ("GOOGL", "Alphabet Inc. Class A"),
        ("GOOG", "Alphabet Inc. Class C"),
        ("TSLA", "Tesla Inc."),
        ("MRVL", "Marvell Technology Inc."),
        ("AVAV", "AeroVironment Inc."),
        ("AMD", "Advanced Micro Devices Inc."),
        ("INTC", "Intel Corporation"),
        ("NFLX", "Netflix Inc."),
        ("COST", "Costco Wholesale Corporation"),
    ]
    return [{"symbol": s, "name": n, "exchange": "NASDAQ"} for s, n in common]


def refresh_symbol_cache() -> list[dict[str, str]]:
    """Önbelleği temizle ve listeyi yeniden indir."""
    global _cache
    _cache = None
    if SYMBOLS_FILE.is_file():
        SYMBOLS_FILE.unlink()
    return ensure_symbols_loaded()


def search_symbols(query: str, limit: int = 40) -> list[dict[str, Any]]:
    """Prefix ve içerik eşleşmesi; sembol öncelikli."""
    q = (query or "").strip().upper()
    if not q:
        return []

    symbols = ensure_symbols_loaded()
    limit = max(1, min(limit, 80))
    prefix: list[dict] = []
    contains: list[dict] = []

    for item in symbols:
        sym = item["symbol"]
        name = item.get("name", "")
        if sym.startswith(q):
            prefix.append({**item, "match": "symbol"})
        elif q in sym or q in name.upper():
            contains.append({**item, "match": "name"})
        if len(prefix) >= limit:
            break

    combined = prefix
    if len(combined) < limit:
        for item in contains:
            if item not in combined:
                combined.append(item)
            if len(combined) >= limit:
                break
    return combined[:limit]
