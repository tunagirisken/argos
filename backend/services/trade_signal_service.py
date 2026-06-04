"""Akıllı trade skoru — teknik + haber birleşimi."""

import logging
from typing import Any

logger = logging.getLogger(__name__)

TECH_WEIGHT = 0.7
NEWS_WEIGHT = 0.3
THRESHOLD_AL = 2.5
THRESHOLD_SAT = -2.5

POSITIVE_WORDS = (
    "beat",
    "surge",
    "growth",
    "upgrade",
    "record",
    "profit",
    "strong",
    "rally",
    "buy",
    "outperform",
    "revenue",
    "bull",
    "artış",
    "yükseliş",
    "kâr",
    "rekor",
)
NEGATIVE_WORDS = (
    "loss",
    "cut",
    "downgrade",
    "layoff",
    "miss",
    "weak",
    "fall",
    "drop",
    "sell",
    "warning",
    "lawsuit",
    "decline",
    "bear",
    "düşüş",
    "zarar",
    "iflas",
    "ceza",
)


def _score_rsi(rsi: float | None) -> int:
    if rsi is None:
        return 0
    if rsi < 35:
        return 1
    if rsi > 65:
        return -1
    return 0


def _score_macd(macd: float | None, macd_signal: float | None) -> int:
    if macd is None or macd_signal is None:
        return 0
    if macd > macd_signal:
        return 1
    if macd < macd_signal:
        return -1
    return 0


def _score_bb(price: float, bb_lower: float | None, bb_upper: float | None) -> int:
    if not price or bb_lower is None or bb_upper is None:
        return 0
    span = bb_upper - bb_lower
    if span <= 0:
        return 0
    near_low = price <= bb_lower * 1.02 or (price - bb_lower) / span < 0.15
    near_high = price >= bb_upper * 0.98 or (bb_upper - price) / span < 0.15
    if near_low:
        return 1
    if near_high:
        return -1
    return 0


def _score_ema(price: float, ema20: float | None) -> int:
    if not price or ema20 is None:
        return 0
    if price > ema20:
        return 1
    if price < ema20:
        return -1
    return 0


def _score_momentum(change_pct: float | None) -> int:
    if change_pct is None:
        return 0
    if change_pct > 2:
        return 1
    if change_pct < -2:
        return -1
    return 0


def _score_news(news: list[dict] | None) -> int:
    """Son 3 haber başlığına göre -1 / 0 / +1."""
    items = (news or [])[:3]
    if not items:
        return 0
    pos = neg = 0
    for item in items:
        title = (item.get("title") or "").lower()
        if any(w in title for w in NEGATIVE_WORDS):
            neg += 1
        elif any(w in title for w in POSITIVE_WORDS):
            pos += 1
    if neg > pos:
        return -1
    if pos > neg:
        return 1
    return 0


def _confidence(score: float, components: dict[str, int]) -> str:
    vals = [v for v in components.values() if v != 0]
    agree = len(vals) >= 3 and (all(v > 0 for v in vals) or all(v < 0 for v in vals))
    if abs(score) >= 2.5 and agree:
        return "YÜKSEK"
    if abs(score) >= 1.5:
        return "ORTA"
    return "DÜŞÜK"


def _decision(score: float) -> str:
    if score >= THRESHOLD_AL:
        return "AL"
    if score <= THRESHOLD_SAT:
        return "SAT"
    return "İZLE"


def calculate_trade_score(
    symbol: str,
    technical: dict[str, Any],
    news: list[dict] | None,
    change_pct: float | None = None,
) -> dict[str, Any]:
    """
    Teknik (5 bileşen × -1/0/+1) × 0.7 + haber × 0.3.
    Karar: >=2.5 AL, <=-2.5 SAT, aksi İZLE.
    """
    price = float(technical.get("price") or 0)
    components = {
        "rsi": _score_rsi(technical.get("rsi")),
        "macd": _score_macd(technical.get("macd"), technical.get("macd_signal")),
        "bb": _score_bb(price, technical.get("bb_lower"), technical.get("bb_upper")),
        "ema": _score_ema(price, technical.get("ema20")),
        "momentum": _score_momentum(
            change_pct if change_pct is not None else technical.get("change_pct")
        ),
        "news": _score_news(news),
    }
    tech_sum = sum(components[k] for k in ("rsi", "macd", "bb", "ema", "momentum"))
    news_score = components["news"]
    raw = TECH_WEIGHT * tech_sum + NEWS_WEIGHT * news_score
    score = round(raw, 2)
    decision = _decision(score)
    # Gösterim: yaklaşık -3.8..+3.8 → /5 ölçeği
    score_display = round(min(5.0, max(-5.0, score / 3.8 * 5)), 1)

    return {
        "symbol": symbol.upper(),
        "score": score,
        "score_display": score_display,
        "decision": decision,
        "components": components,
        "confidence": _confidence(score, components),
        "tech_sum": tech_sum,
        "news_score": news_score,
    }


_COMPONENT_LABELS = {
    "rsi": "RSI",
    "macd": "MACD",
    "bb": "BB",
    "ema": "EMA",
    "momentum": "Mom",
    "news": "Haber",
}

_DECISION_EMOJI = {"AL": "🟢", "SAT": "🔴", "İZLE": "⚪"}


def format_components_line(components: dict[str, int]) -> str:
    parts = []
    for k, v in components.items():
        if v == 0:
            continue
        sign = "+" if v > 0 else ""
        parts.append(f"{_COMPONENT_LABELS.get(k, k)}{sign}{v}")
    return ", ".join(parts) if parts else "nötr"


def format_trade_signal_text(score_data: dict[str, Any]) -> str:
    """Telegram / UI için kısa özet."""
    decision = score_data.get("decision", "İZLE")
    emoji = _DECISION_EMOJI.get(decision, "📊")
    sym = score_data.get("symbol", "")
    score_disp = score_data.get("score_display", score_data.get("score", 0))
    lines = [
        f"{emoji} {sym} — {decision} (Skor: {score_disp}/5)",
        f"Güven: {score_data.get('confidence', 'ORTA')} · Ham skor: {score_data.get('score')}",
        f"Bileşenler: {format_components_line(score_data.get('components', {}))}",
    ]
    price = score_data.get("price")
    if price:
        lines.append(f"Fiyat: ${float(price):.2f}")
    pos = score_data.get("position")
    if pos and pos.get("avg_cost"):
        lines.append(
            f"Pozisyon: maliyet ${float(pos['avg_cost']):.2f} · getiri {pos.get('return_pct', 0):+.2f}%"
        )
    last = score_data.get("last_decision")
    if last and last != decision:
        lines.append(f"Son bildirim kararı: {last}")
    return "\n".join(lines)
