"""Uygulama yapılandırması — LLM, bildirimler, scheduler."""

import logging
import os

from backend.utils.env_config import load_env
from backend.utils.json_store import read_json, write_json
from backend.utils.paths import BACKEND_ROOT, DATA_DIR

logger = logging.getLogger(__name__)

CONFIG_FILE = DATA_DIR / "app_config.json"
ENV_PATH = BACKEND_ROOT / ".env"

_DEFAULT = {
    "llm_provider": "gemini",
    "notifications": {
        "price": True,
        "stop": True,
        "rsi": True,
        "daily": True,
        "news": False,
    },
    "scheduler": {
        "morning": "08:30",
        "close": "23:05",
        "morning_on": True,
        "close_on": True,
    },
    "preferences": {
        "currency": "USD",
        "timezone": "Europe/Istanbul",
    },
}


def _load() -> dict:
    data = read_json(CONFIG_FILE, default=None)
    if not data:
        load_env()
        provider = (os.getenv("LLM_PROVIDER") or "gemini").strip().lower()
        data = {**_DEFAULT, "llm_provider": provider}
        write_json(CONFIG_FILE, data)
    return data


def _save(data: dict) -> None:
    write_json(CONFIG_FILE, data)


def get_config() -> dict:
    return _load()


def set_llm_provider(provider: str) -> dict:
    provider = provider.strip().lower()
    if provider not in ("anthropic", "gemini"):
        raise ValueError("llm_provider: anthropic veya gemini olmalı")
    data = _load()
    data["llm_provider"] = provider
    _save(data)
    _patch_env("LLM_PROVIDER", provider)
    load_env()
    return {"ok": True, "llm_provider": provider}


def set_notifications(body: dict) -> dict:
    data = _load()
    notif = data.setdefault("notifications", {**_DEFAULT["notifications"]})
    for key in ("price", "stop", "rsi", "daily", "news"):
        if key in body:
            notif[key] = bool(body[key])
    _save(data)
    return {"ok": True, "notifications": notif}


def set_scheduler(body: dict) -> dict:
    data = _load()
    sched = data.setdefault("scheduler", {**_DEFAULT["scheduler"]})
    for key in ("morning", "close", "morning_on", "close_on"):
        if key in body and body[key] is not None:
            sched[key] = body[key]
    _save(data)
    return {"ok": True, "scheduler": sched}


def set_preferences(body: dict) -> dict:
    data = _load()
    prefs = data.setdefault("preferences", {**_DEFAULT["preferences"]})
    if "currency" in body:
        prefs["currency"] = body["currency"]
    if "timezone" in body:
        prefs["timezone"] = body["timezone"]
    _save(data)
    return {"ok": True, "preferences": prefs}


def _patch_env(key: str, value: str) -> None:
    if not ENV_PATH.is_file():
        return
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f"{key}={value}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"{key}={value}")
    ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")
