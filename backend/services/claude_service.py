"""Portföy asistanı — dış API aynı; iç çağrılar llm_service üzerinden."""

import logging
from pathlib import Path

from backend.services import technical_service
from backend.services.llm_service import call_llm
from backend.utils import formatters
from backend.utils.json_store import read_json
from backend.utils.paths import PORTFOLIO_FILE

logger = logging.getLogger(__name__)

MAX_TOKENS_REPORT = 400
MAX_TOKENS_PORTFOLIO = 1200
MAX_TOKENS_CHAT = 600
MAX_TOKENS_TRADE_ALERT = 200
MAX_TOKENS_DISCOVERY = 250

_PROMPTS_DIR = Path(__file__).resolve().parents[2].parent / "ai" / "prompts"

PORTFOLIO_ANALYSIS_SYSTEM = (
    "Kıdemli portföy analistsin. Türkçe yaz. Gereksiz giriş/kapanış cümlesi yazma. "
    "Direkt analize geç. Markdown bold kullanma, düz metin ve emoji yeterli."
)

PORTFOLIO_OUTPUT_FORMAT = """Çıktı formatı (sembolü ve rakamları veriye göre doldur):
📊 NVDA Analiz
💰 Pozisyon: $185.70 maliyet → $222.82 güncel (+19.99% / +$74)

📍 Pozisyon Durumu
[2-3 cümle]

📈 Teknik Görünüm
[2-3 cümle]

⚠️ Risk Yönetimi
[2-3 cümle]

🎯 Aksiyon Önerisi
[2-3 cümle]"""

COMPACT_SYSTEM = """
ARGOS portföy asistanı. Türkçe, kısa, net yanıt.
Portföy: {compact_portfolio}
Teknik: {compact_technical}
Haberler: {news_headlines_only}
Kural: Her yanıt max 3 paragraf. Sorumluluk reddi ekle.
"""


def _build_system(
    portfolio: dict,
    prices: dict | None,
    signals: dict | None,
    news: list | None,
) -> str:
    return COMPACT_SYSTEM.format(
        compact_portfolio=formatters.compact_portfolio(portfolio, prices),
        compact_technical=formatters.compact_technical(signals or {}),
        news_headlines_only=formatters.compact_news_headlines(news or []),
    )


async def _call_claude(
    system: str,
    user_message: str,
    max_tokens: int = MAX_TOKENS_REPORT,
) -> str:
    """LLM çağrısı (sağlayıcı LLM_PROVIDER ile seçilir)."""
    try:
        return await call_llm(user_message, max_tokens, system=system)
    except ValueError as e:
        logger.warning("%s", e)
        return "LLM API anahtarı yapılandırılmamış."
    except Exception as e:
        logger.error("LLM hatası: %s", e)
        try:
            import sentry_sdk

            sentry_sdk.capture_exception(e)
        except ImportError:
            pass
        raise


async def morning_briefing(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Sabah brifing — günde 1x."""
    system = _build_system(portfolio, prices, signals, news)
    return await _call_claude(
        system,
        "Sabah brifing: bugün portföy için öncelikli 3 madde ve dikkat edilecek riskler.",
        MAX_TOKENS_REPORT,
    )


async def closing_report(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Kapanış raporu — günde 1x."""
    system = _build_system(portfolio, prices, signals, news)
    return await _call_claude(
        system,
        "Gün kapanış özeti: pozisyon durumu, stop/hedef yakınlığı, yarın için 2 aksiyon.",
        MAX_TOKENS_REPORT,
    )


def _macd_comment(indicators: dict) -> str:
    hist = indicators.get("macd_histogram")
    if hist is None:
        return "nötr"
    if hist > 0:
        return "pozitif momentum"
    if hist < 0:
        return "negatif momentum"
    return "nötr"


def _volume_note(indicators: dict) -> str:
    vr = indicators.get("volume_ratio")
    if vr is None:
        return "hacim verisi yok"
    if vr >= 1.5:
        return f"ortalamanın {vr}x üstü — yüksek ilgi"
    if vr >= 1.0:
        return f"ortalamanın {vr}x — normal"
    return f"ortalamanın {vr}x — düşük"


def _build_position_user_prompt(
    pos: dict,
    price_data: dict,
    indicators: dict,
    signal_data: dict,
) -> str:
    sym = pos["symbol"]
    name = pos.get("name") or sym
    avg = float(pos.get("avg_cost") or 0)
    shares = float(pos.get("shares") or 0)
    price = float(price_data.get("price") or indicators.get("price") or 0)
    daily = float(price_data.get("change_pct") or 0)
    stop = float(pos.get("stop_loss") or 0)
    target = float(pos.get("target") or 0)

    if price and avg:
        ret_pct = ((price - avg) / avg) * 100
        ret_usd = (price - avg) * shares
    else:
        ret_pct = 0.0
        ret_usd = 0.0

    stop_dist = ((price - stop) / price * 100) if price and stop else 0.0
    target_pot = ((target - price) / price * 100) if price and target else 0.0

    rsi = indicators.get("rsi")
    rsi_s = f"{rsi:.1f}" if rsi is not None else "—"
    sig = signal_data.get("signal", "BEKLE")
    macd = _macd_comment(indicators)

    return (
        f"{PORTFOLIO_OUTPUT_FORMAT}\n\n"
        f"---\n"
        f"Hisse: {sym} ({name})\n"
        f"Maliyet: ${avg:.2f} | Güncel: ${price:.2f} | Getiri: {ret_pct:+.2f}% (${ret_usd:+.2f})\n"
        f"Stop: ${stop:.2f} ({stop_dist:.1f}% uzakta)\n"
        f"Hedef: ${target:.2f} ({target_pot:.1f}% potansiyel)\n"
        f"RSI: {rsi_s} | MACD: {macd} | Genel Sinyal: {sig}\n"
        f"Günlük: {daily:+.2f}% | Hacim: {_volume_note(indicators)}\n"
        f"---\n\n"
        "Şu başlıkları sırayla yaz, her biri 2-3 cümle:\n"
        "1. Pozisyon Durumu\n"
        "2. Teknik Görünüm\n"
        "3. Risk Yönetimi\n"
        "4. Aksiyon Önerisi\n\n"
        "Yukarıdaki çıktı formatını aynen koru. Giriş veya kapanış cümlesi ekleme."
    )


async def analyze_portfolio(
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Manuel portföy analizi — hisse başına tam metin."""
    _ = news
    sections: list[str] = []
    for pos in portfolio.get("positions", []):
        sym = pos["symbol"]
        try:
            ind = await technical_service.compute_indicators(sym)
        except Exception as e:
            logger.warning("Analiz göstergesi %s: %s", sym, e)
            ind = {}
        user_prompt = _build_position_user_prompt(
            pos, prices.get(sym, {}), ind, signals.get(sym, {})
        )
        block = await _call_claude(
            PORTFOLIO_ANALYSIS_SYSTEM, user_prompt, MAX_TOKENS_PORTFOLIO
        )
        sections.append(block)
    return "\n\n".join(sections) if sections else "Portföyde pozisyon yok."


async def analyze_symbol(
    symbol: str,
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Tek sembol analizi."""
    system = _build_system(portfolio, prices, signals, news)
    return await _call_claude(
        system,
        f"{symbol} pozisyonu için kısa analiz ve stop/hedef değerlendirmesi.",
        MAX_TOKENS_REPORT,
    )


async def chat(
    message: str,
    portfolio: dict,
    prices: dict,
    signals: dict,
    news: list,
) -> str:
    """Kullanıcı sohbeti."""
    system = _build_system(portfolio, prices, signals, news)
    return await _call_claude(system, message, MAX_TOKENS_CHAT)


def _load_prompt(name: str) -> str:
    path = _PROMPTS_DIR / name
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    return ""


async def discovery_thesis(item: dict, entry_zone: str, horizon: str) -> str:
    """Keşif top-5 — hisse başına max 250 token."""
    m = item.get("metrics", {})
    b = item.get("breakdown", {})
    system = _load_prompt("discovery-thesis-system.md") or (
        "Kısa-orta vade trade analisti. Türkçe. Yatırım tavsiyesi değildir."
    )
    user_tmpl = _load_prompt("discovery-thesis-user.md")
    user = user_tmpl.format(
        symbol=item.get("symbol", ""),
        name=item.get("name", ""),
        sector=item.get("sector", "—"),
        score=item.get("score", 0),
        horizon=horizon,
        momentum=b.get("momentum", 0),
        volatility=b.get("volatility", 0),
        volume=b.get("volume", 0),
        technical=b.get("technical", 0),
        news=b.get("news", 0),
        price=f"{m.get('price', 0):.2f}",
        entry_zone=entry_zone,
        rsi=m.get("rsi", "—"),
        atr_pct=round((m.get("atr_pct") or 0) * 100, 2),
        mom5=m.get("mom5", 0),
        mom20=m.get("mom20", 0),
        vol_ratio=m.get("vol_ratio", 1),
        headlines=" | ".join(item.get("headlines", [])[:3]) or "yok",
    )
    return await _call_claude(system, user, MAX_TOKENS_DISCOVERY)


async def trade_alert_message(
    symbol: str,
    score_data: dict,
    position: dict,
    price: float,
) -> str:
    """Trade AL/SAT bildirimi — max 200 token."""
    avg = float(position.get("avg_cost") or 0)
    shares = float(position.get("shares") or 0)
    ret_pct = ((price - avg) / avg * 100) if avg and price else 0.0
    components = score_data.get("components", {})
    comp_str = ", ".join(f"{k}={v}" for k, v in components.items())

    system = _load_prompt("trade-alert-system.md") or (
        "Kısa, net, Türkçe trade bildirimi yaz."
    )
    user_tmpl = _load_prompt("trade-alert-user.md")
    user = user_tmpl.format(
        symbol=symbol,
        decision=score_data.get("decision", "İZLE"),
        score=score_data.get("score_display", score_data.get("score", 0)),
        price=f"{price:.2f}",
        components=comp_str,
        avg_cost=f"{avg:.2f}",
        return_pct=f"{ret_pct:+.2f}",
        confidence=score_data.get("confidence", "ORTA"),
    )
    return await _call_claude(system, user, MAX_TOKENS_TRADE_ALERT)


async def stop_loss_alert_message(
    symbol: str,
    price: float,
    stop_loss: float,
    portfolio: dict,
) -> str:
    """Stop-loss ACİL — kısa LLM mesajı."""
    system = _build_system(portfolio, {symbol: {"price": price}}, {}, [])
    return await _call_claude(
        system,
        f"ACİL: {symbol} fiyat ${price:.2f} stop ${stop_loss:.2f} altında. "
        "Max 2 cümle aksiyon önerisi.",
        150,
    )


def load_portfolio() -> dict:
    return read_json(PORTFOLIO_FILE, default={})
