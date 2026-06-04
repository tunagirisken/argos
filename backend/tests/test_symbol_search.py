"""Sembol arama testleri."""

from backend.services import symbol_search_service


def test_search_prefix():
    symbol_search_service._cache = None  # noqa: SLF001
    symbol_search_service.ensure_symbols_loaded()
    results = symbol_search_service.search_symbols("NV", limit=10)
    assert any(r["symbol"] == "NVDA" for r in results)


def test_search_empty():
    assert symbol_search_service.search_symbols("") == []
