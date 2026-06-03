"""Claude ve Telegram için kompakt metin formatlayıcılar — token tasarrufu."""

from typing import Any


def compact_portfolio(portfolio: dict, prices: dict[str, dict] | None = None) -> str:
    """Portföyü tek satırlık özetlere dönüştürür."""
    lines = [f"Nakit:${portfolio.get('cash_usd', 0)}"]
    for pos in portfolio.get("positions", []):
        sym = pos["symbol"]
        p = (prices or {}).get(sym, {})
        price = p.get("price", "?")
        chg = p.get("change_pct", 0)
        pl = ""
        if isinstance(price, (int, float)) and pos.get("avg_cost"):
            pl_pct = ((price - pos["avg_cost"]) / pos["avg_cost"]) * 100
            pl = f" P/L:{pl_pct:+.1f}%"
        lines.append(
            f"{sym}:{pos['shares']}@${pos['avg_cost']} "
            f"şimdi:{price}({chg:+.1f}%){pl} SL:{pos.get('stop_loss')} H:{pos.get('target')}"
        )
    return " | ".join(lines)


def compact_technical(signals: dict[str, dict]) -> str:
    """Teknik sinyal özetleri."""
    parts = []
    for sym, sig in signals.items():
        parts.append(f"{sym}:{sig.get('signal','?')}({sig.get('confidence',0):.0%})")
    return " | ".join(parts) if parts else "Veri yok"


def compact_news_headlines(news: list[dict]) -> str:
    """Yalnızca başlıklar — içerik gönderilmez."""
    return " | ".join(n.get("title", "")[:80] for n in news[:5]) or "Haber yok"


def format_price_table(prices: dict[str, dict], symbols: list[str]) -> str:
    """Telegram için kısa fiyat tablosu."""
    rows = []
    for sym in symbols:
        p = prices.get(sym, {})
        if not p:
            rows.append(f"{sym}: veri yok")
            continue
        rows.append(
            f"{sym}: ${p.get('price', 0):.2f} ({p.get('change_pct', 0):+.2f}%)"
        )
    return "\n".join(rows)


def format_signal_summary(signals: dict[str, dict]) -> str:
    """Telegram açılış raporu için sinyal özeti."""
    rows = []
    for sym, sig in signals.items():
        rows.append(
            f"{sym}: {sig.get('signal', 'BEKLE')} "
            f"({sig.get('confidence', 0):.0%}) — {sig.get('risk_level', '?')}"
        )
    return "\n".join(rows)
