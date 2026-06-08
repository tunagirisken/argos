"""İşlem motoru — durum, stratejiler, işlemler, equity (JSON persist)."""

import logging
import math
import random
import uuid
from datetime import datetime, timedelta, timezone

from backend.utils.json_store import read_json, write_json
from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)

ENGINE_FILE = DATA_DIR / "engine.json"

_DEFAULT = {
    "running": True,
    "mode": "paper",
    "risk_per_trade": 2.0,
    "max_positions": 6,
    "auto_telegram": True,
    "strategies": [
        {
            "id": "momentum",
            "name": "Momentum Kırılım",
            "desc": "20 günlük direnç kırılımı + hacim onayı",
            "active": True,
            "win_rate": 68,
            "trades": 42,
        },
        {
            "id": "ema",
            "name": "EMA Geçiş",
            "desc": "EMA20 / EMA50 altın kesişimi",
            "active": True,
            "win_rate": 61,
            "trades": 35,
        },
        {
            "id": "rsi",
            "name": "RSI Dönüş",
            "desc": "RSI 30 altından dönüş + MACD onayı",
            "active": True,
            "win_rate": 64,
            "trades": 28,
        },
        {
            "id": "meanrev",
            "name": "Ortalamaya Dönüş",
            "desc": "Bollinger alt bandı + aşırı satım",
            "active": False,
            "win_rate": 57,
            "trades": 19,
        },
    ],
    "trades": [
        {
            "symbol": "MRVL",
            "side": "AL",
            "qty": 40,
            "entry": 295.10,
            "current": 319.58,
            "pnl_pct": 8.29,
            "status": "açık",
            "strategy": "Momentum Kırılım",
            "opened_at": "2026-06-03T10:00:00",
        },
        {
            "symbol": "AMD",
            "side": "AL",
            "qty": 60,
            "entry": 151.20,
            "current": 164.05,
            "pnl_pct": 8.50,
            "status": "açık",
            "strategy": "EMA Geçiş",
            "opened_at": "2026-06-01T10:00:00",
        },
        {
            "symbol": "NVDA",
            "side": "AL",
            "qty": 80,
            "entry": 168.40,
            "current": 178.34,
            "pnl_pct": 5.90,
            "status": "açık",
            "strategy": "RSI Dönüş",
            "opened_at": "2026-05-28T10:00:00",
        },
        {
            "symbol": "PLTR",
            "side": "SAT",
            "qty": 120,
            "entry": 44.80,
            "current": 41.22,
            "pnl_pct": 7.99,
            "status": "kapalı",
            "strategy": "Stop Koruma",
            "opened_at": "2026-06-04T10:00:00",
        },
    ],
    "feed": [
        {
            "time": "10:42:18",
            "symbol": "MRVL",
            "message": "Momentum kırılımı onaylandı, AL sinyali",
            "tone": "buy",
        },
        {
            "time": "10:39:02",
            "symbol": "AMD",
            "message": "Hacim ortalamanın 1.8x üzerinde, pozisyon korunuyor",
            "tone": "info",
        },
    ],
}


def _load() -> dict:
    data = read_json(ENGINE_FILE, default=None)
    if not data:
        data = {**_DEFAULT}
        write_json(ENGINE_FILE, data)
    return data


def _save(data: dict) -> None:
    write_json(ENGINE_FILE, data)


def _metrics(data: dict) -> dict:
    trades = data.get("trades", [])
    open_trades = [t for t in trades if t.get("status") == "açık"]
    wins = sum(1 for t in trades if float(t.get("pnl_pct", 0)) > 0)
    total_pnl = sum(float(t.get("pnl_pct", 0)) for t in trades)
    win_rate = round((wins / len(trades)) * 100) if trades else 0
    return {
        "total_return_pct": round(total_pnl / max(len(trades), 1) * 0.5, 2),
        "win_rate": win_rate,
        "open_positions": len(open_trades),
        "max_positions": int(data.get("max_positions", 6)),
        "risk_per_trade": float(data.get("risk_per_trade", 2)),
        "sharpe": 1.84,
        "wins": wins,
        "trade_count": len(trades),
    }


def get_status() -> dict:
    data = _load()
    active = sum(1 for s in data.get("strategies", []) if s.get("active"))
    return {
        "running": bool(data.get("running", True)),
        "mode": data.get("mode", "paper"),
        "active_strategies": active,
        "metrics": _metrics(data),
    }


def toggle_running() -> dict:
    data = _load()
    data["running"] = not bool(data.get("running", True))
    _save(data)
    return {"running": data["running"]}


def update_config(body: dict) -> dict:
    data = _load()
    for key in ("mode", "risk_per_trade", "max_positions", "auto_telegram"):
        if key in body and body[key] is not None:
            data[key] = body[key]
    _save(data)
    return {"ok": True, "config": {k: data[k] for k in ("mode", "risk_per_trade", "max_positions", "auto_telegram")}}


def list_strategies() -> list[dict]:
    return _load().get("strategies", [])


def set_strategy_active(strategy_id: str, active: bool) -> dict:
    data = _load()
    found = False
    for s in data.get("strategies", []):
        if s.get("id") == strategy_id:
            s["active"] = active
            found = True
            break
    if not found:
        raise ValueError(f"Strateji bulunamadı: {strategy_id}")
    _save(data)
    return {"ok": True, "id": strategy_id, "active": active}


def list_trades() -> list[dict]:
    return _load().get("trades", [])


def get_equity(days: int = 90) -> list[dict]:
    """Sermaye eğrisi — deterministik simülasyon."""
    rng = random.Random(42)
    eq = 100_000.0
    out: list[dict] = []
    now = datetime.now(timezone.utc)
    for i in range(days):
        dt = now - timedelta(days=days - i)
        r = math.sin(i * 0.6) * 0.004 + (i / days) * 0.006 + 0.002
        eq *= 1 + r + rng.uniform(-0.001, 0.001)
        out.append({"time": dt.strftime("%Y-%m-%d"), "value": round(eq, 2)})
    return out


def get_feed(limit: int = 20) -> list[dict]:
    return _load().get("feed", [])[:limit]


def append_feed(symbol: str, message: str, tone: str = "info") -> dict:
    data = _load()
    now = datetime.now().strftime("%H:%M:%S")
    entry = {"time": now, "symbol": symbol, "message": message, "tone": tone, "id": str(uuid.uuid4())[:8]}
    feed = data.setdefault("feed", [])
    feed.insert(0, entry)
    data["feed"] = feed[:50]
    _save(data)
    return entry
