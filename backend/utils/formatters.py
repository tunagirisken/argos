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


def format_discovery_report(data: dict[str, Any]) -> str:
    """Telegram keşif raporu."""
    date = (data.get("generated_at") or "")[:10] or "bugün"
    lines = [
        f"🔍 ARGOS Keşif Raporu — {date}",
        f"{data.get('scanned_count', 0)} hisse tarandı, en iyi {len(data.get('opportunities', []))} fırsat:",
        "",
    ]
    emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
    for i, opp in enumerate(data.get("opportunities", [])[:5]):
        prefix = emojis[i] if i < len(emojis) else f"{i+1}."
        b = opp.get("breakdown", {})
        lines.append(
            f"{prefix} {opp.get('symbol')} ({opp.get('sector', '—')}) — Skor {opp.get('score', 0):.0f}/100"
        )
        lines.append(
            f"📊 Mom {b.get('momentum', 0):.0f} | Vol {b.get('volatility', 0):.0f} | "
            f"Hacim {b.get('volume', 0):.0f} | Tek {b.get('technical', 0):.0f}"
        )
        lines.append(
            f"🎯 Ufuk: {opp.get('decision_horizon', '2-6 hafta')} | Giriş: {opp.get('entry_zone', '—')}"
        )
        thesis = (opp.get("thesis") or "")[:400]
        lines.append(f"💡 {thesis}")
        lines.append(f"⚠️ Risk: {opp.get('main_risk', '—')}")
        lines.append("")
    lines.append(f"⚠️ {data.get('disclaimer', 'Yatırım tavsiyesi değildir.')}")
    return "\n".join(lines)


def format_signal_summary(signals: dict[str, dict]) -> str:
    """Telegram açılış raporu için sinyal özeti."""
    rows = []
    for sym, sig in signals.items():
        rows.append(
            f"{sym}: {sig.get('signal', 'BEKLE')} "
            f"({sig.get('confidence', 0):.0%}) — {sig.get('risk_level', '?')}"
        )
    return "\n".join(rows)
