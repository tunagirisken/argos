"""Aktif .env entegrasyon anahtarlarını docs/LOCAL-ENV.md dosyasına yazar (gitignore)."""

import logging
from datetime import datetime, timezone
from pathlib import Path

from dotenv import dotenv_values

from backend.utils.env_config import ENV_FILE

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
LOCAL_ENV_DOC = REPO_ROOT / "docs" / "LOCAL-ENV.md"

# Dokümana yazılacak entegrasyon anahtarları (admin şifre/JWT hariç)
_INTEGRATION_KEYS = (
    "LLM_PROVIDER",
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "FIRECRAWL_API_KEY",
    "EXA_API_KEY",
    "SENTRY_DSN",
)


def sync_local_env_doc() -> bool:
    """backend/.env → docs/LOCAL-ENV.md; admin girişi veya setup sonrası çağrılır."""
    if not ENV_FILE.is_file():
        logger.warning("local_env_doc: %s yok", ENV_FILE)
        return False

    values = dotenv_values(ENV_FILE)
    lines = [
        "# Yerel API Anahtarları",
        "",
        "Bu dosya **git'e girmez**. Admin girişinde veya kurulum sihirbazında kullanılan",
        "entegrasyon anahtarlarının yerel yedeğidir. ARGOS uygulamasında **Docs → Yapılandırma (.env)**",
        "sayfasından da görüntülenir.",
        "",
        f"Son güncelleme: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## backend/.env (entegrasyonlar)",
        "",
        "```env",
    ]
    for key in _INTEGRATION_KEYS:
        val = (values.get(key) or "").strip()
        lines.append(f"{key}={val}")
    lines.extend(["```", ""])

    LOCAL_ENV_DOC.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_ENV_DOC.write_text("\n".join(lines), encoding="utf-8")
    logger.info("local_env_doc güncellendi → %s", LOCAL_ENV_DOC)
    return True


def read_local_env_doc() -> str | None:
    if not LOCAL_ENV_DOC.is_file():
        return None
    return LOCAL_ENV_DOC.read_text(encoding="utf-8")
