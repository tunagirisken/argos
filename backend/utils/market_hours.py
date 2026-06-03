"""ABD borsa saatleri — Türkiye saati (UTC+3) bazlı yardımcılar."""

from datetime import datetime, time
from zoneinfo import ZoneInfo

IST = ZoneInfo("Europe/Istanbul")

# NYSE/NASDAQ açılış-kapanış TR saati (yaz/kış saati yaklaşık)
MARKET_OPEN = time(16, 30)
MARKET_CLOSE = time(23, 0)


def now_istanbul() -> datetime:
    """Şu anki zamanı İstanbul saat diliminde döndürür."""
    return datetime.now(IST)


def is_weekday(dt: datetime | None = None) -> bool:
    """Hafta içi mi kontrol eder (Pzt=0 … Cum=4)."""
    dt = dt or now_istanbul()
    return dt.weekday() < 5


def is_us_market_hours(dt: datetime | None = None) -> bool:
    """
    ABD piyasası aktif penceresi: hafta içi 16:30–23:00 TR.
    Alarm ve WebSocket yayını bu pencerede çalışır.
    """
    dt = dt or now_istanbul()
    if not is_weekday(dt):
        return False
    t = dt.time()
    return MARKET_OPEN <= t < MARKET_CLOSE
