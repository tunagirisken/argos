"""Portföy tavsiye servisi testleri."""

from backend.services import portfolio_advisor_service


def test_suggest_stop_trailing():
    ind = {"bb_lower": 150.0}
    stop, reason = portfolio_advisor_service._suggest_stop(100.0, 120.0, ind)
    assert stop > 100 * 0.92
    assert "trailing" in reason or "Bollinger" in reason


def test_suggest_target_analyst():
    target, reason = portfolio_advisor_service._suggest_target(
        100.0, 110.0, {}, {"recommended_target": 250.0, "confidence": "yüksek"}
    )
    assert target == 250.0
    assert "analist" in reason


def test_needs_update():
    assert portfolio_advisor_service._needs_update(100.0, 105.0) is True
    assert portfolio_advisor_service._needs_update(100.0, 100.5) is False
