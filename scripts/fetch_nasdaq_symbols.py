#!/usr/bin/env python3
"""Nasdaq sembol listesini backend/data/nasdaq_symbols.json olarak indir."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.services.symbol_search_service import _fetch_nasdaq_listed, _save_to_disk

if __name__ == "__main__":
    symbols = _fetch_nasdaq_listed()
    _save_to_disk(symbols)
    print(f"Kaydedildi: {len(symbols)} sembol → backend/data/nasdaq_symbols.json")
