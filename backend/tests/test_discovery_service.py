"""Keşif skorlama testleri (ağ yok)."""

from backend.services.discovery_service import _news_sentiment_score, _norm_0_100


def test_norm_0_100():
    assert _norm_0_100(5, 0, 10) == 50.0
    assert _norm_0_100(0, 0, 10) == 0.0


def test_news_sentiment():
    assert _news_sentiment_score(["record growth beat"]) > 50
    assert _news_sentiment_score(["loss layoffs downgrade"]) < 50


def test_weights_sum_to_one():
    from backend.services.discovery_service import WEIGHTS

    assert abs(sum(WEIGHTS.values()) - 1.0) < 0.001
