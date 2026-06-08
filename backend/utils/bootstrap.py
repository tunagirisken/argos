"""Admin girişinde yerel bootstrap dosyasından .env oluştur."""

import logging
import shutil

from dotenv import dotenv_values

from backend.utils.env_config import ENV_FILE, load_env
from backend.utils.local_env_doc import sync_local_env_doc
from backend.utils.paths import BACKEND_ROOT

logger = logging.getLogger(__name__)

BOOTSTRAP_FILE = BACKEND_ROOT / ".env.bootstrap"

# Bootstrap / kurulum yazımında korunacak alanlar (admin oturumu)
PRESERVE_ENV_KEYS = ("ARGOS_ADMIN_USER", "ARGOS_ADMIN_PASSWORD", "ARGOS_JWT_SECRET")


def read_preserved_env() -> dict[str, str]:
    """Mevcut .env içinden admin/JWT satırlarını oku."""
    if not ENV_FILE.is_file():
        return {}
    preserved: dict[str, str] = {}
    for key, val in dotenv_values(ENV_FILE).items():
        if key in PRESERVE_ENV_KEYS and val:
            preserved[key] = str(val).strip()
    return preserved


def append_preserved_env_lines(lines: list[str], preserved: dict[str, str] | None = None) -> list[str]:
    """Satır listesine korunan admin değişkenlerini ekle."""
    kept = preserved if preserved is not None else read_preserved_env()
    if kept:
        lines.append("")
        lines.append("# Admin oturum (korundu)")
        for key in PRESERVE_ENV_KEYS:
            if key in kept:
                lines.append(f"{key}={kept[key]}")
    return lines


def apply_admin_bootstrap() -> bool:
    """
    backend/.env.bootstrap → backend/.env (API anahtarları).
    Mevcut admin/JWT satırları silinmez.
    """
    if not BOOTSTRAP_FILE.is_file():
        logger.warning("Admin bootstrap: %s bulunamadı", BOOTSTRAP_FILE)
        return False

    preserved = read_preserved_env()

    shutil.copyfile(BOOTSTRAP_FILE, ENV_FILE)

    if preserved:
        with ENV_FILE.open("a", encoding="utf-8") as f:
            f.write("\n# Admin oturum (bootstrap sonrası korundu)\n")
            for key, val in preserved.items():
                f.write(f"{key}={val}\n")

    load_env()
    sync_local_env_doc()
    logger.info("Admin bootstrap uygulandı → %s", ENV_FILE)
    return True
