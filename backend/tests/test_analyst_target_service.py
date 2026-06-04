"""Analist hedef fiyat yardımcı testleri."""

from backend.services import analyst_target_service as svc


def test_parse_dollar():
    assert svc._parse_dollar("Average price target $245.50") == 245.5
    assert svc._parse_dollar("consensus 1,234.00") == 1234.0
    assert svc._parse_dollar("no numbers") is None


def test_confidence_high():
    yf = {"analyst_count": 8, "target_mean": 200.0}
    web = {"target_mean": 205.0}
    assert svc._confidence(yf, web) == "yüksek"


def test_confidence_medium():
    yf = {"analyst_count": 4, "target_mean": 100.0}
    assert svc._confidence(yf, None) == "orta"


def test_pick_target_prefers_yfinance():
    yf = {"target_mean": 150.0, "analyst_count": 10}
    web = {"target_mean": 152.0}
    assert svc._pick_target(yf, web) == 151.0


def test_command_catalog():
    from backend.services.telegram_bot_service import get_command_catalog

    cmds = get_command_catalog()
    names = {c["command"] for c in cmds}
    assert "/hedef_guncelle" in names
    assert "/analiz" in names
