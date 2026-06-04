"""Trade skor hesaplama testleri."""

from backend.services.trade_signal_service import (
    calculate_trade_score,
    format_trade_signal_text,
)


def test_al_signal_high_score():
    technical = {
        "price": 100,
        "rsi": 30,
        "macd": 1.5,
        "macd_signal": 1.0,
        "bb_lower": 95,
        "bb_upper": 110,
        "bb_mid": 102,
        "ema20": 98,
        "change_pct": 3.0,
    }
    news = [{"title": "Company beats earnings record growth"}]
    r = calculate_trade_score("NVDA", technical, news)
    assert r["decision"] == "AL"
    assert r["score"] >= 2.5
    assert r["components"]["rsi"] == 1
    assert r["components"]["news"] == 1


def test_sat_signal():
    technical = {
        "price": 108,
        "rsi": 70,
        "macd": 0.5,
        "macd_signal": 1.0,
        "bb_lower": 90,
        "bb_upper": 108,
        "ema20": 110,
        "change_pct": -3.0,
    }
    news = [{"title": "Company reports loss and layoffs downgrade"}]
    r = calculate_trade_score("X", technical, news)
    assert r["decision"] == "SAT"
    assert r["score"] <= -2.5


def test_watch_neutral():
    technical = {
        "price": 100,
        "rsi": 50,
        "macd": 1.0,
        "macd_signal": 1.0,
        "bb_lower": 90,
        "bb_upper": 110,
        "ema20": 100,
        "change_pct": 0.5,
    }
    r = calculate_trade_score("Y", technical, [])
    assert r["decision"] == "İZLE"


def test_format_trade_signal_text():
    text = format_trade_signal_text(
        {
            "symbol": "NVDA",
            "decision": "AL",
            "score": 3.1,
            "score_display": 4.1,
            "confidence": "YÜKSEK",
            "components": {"rsi": 1, "macd": 1, "news": 0},
            "price": 120.5,
            "position": {"avg_cost": 100.0, "return_pct": 20.5},
        }
    )
    assert "NVDA" in text
    assert "AL" in text
    assert "RSI+1" in text


def test_should_notify_logic():
    from backend.services import trade_alert_service as tas

    tas._last_decisions.clear()
    assert tas._should_notify("NVDA", "AL") is True
    tas._last_decisions["NVDA"] = "AL"
    assert tas._should_notify("NVDA", "AL") is False
    assert tas._should_notify("NVDA", "İZLE") is False
    tas._last_decisions["NVDA"] = "İZLE"
    assert tas._should_notify("NVDA", "SAT") is True
