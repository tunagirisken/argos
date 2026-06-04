"""backend/.env yükleme — kurulum sonrası yeniden okuma."""

import os
from pathlib import Path

from dotenv import load_dotenv

from backend.utils.paths import BACKEND_ROOT

ENV_FILE = BACKEND_ROOT / ".env"


def load_env() -> None:
    """Ortam değişkenlerini backend/.env dosyasından yükle (override)."""
    if ENV_FILE.is_file():
        load_dotenv(ENV_FILE, override=True)


def llm_configured() -> bool:
    """Seçili LLM sağlayıcı için API anahtarı var mı?"""
    load_env()
    provider = (os.getenv("LLM_PROVIDER") or "anthropic").strip().lower()
    if provider == "gemini":
        return bool((os.getenv("GEMINI_API_KEY") or "").strip())
    if provider == "anthropic":
        return bool((os.getenv("ANTHROPIC_API_KEY") or "").strip())
    return False
