"""Admin girişinde yerel bootstrap dosyasından .env oluştur."""

import logging
import shutil

from dotenv import dotenv_values

from backend.utils.env_config import ENV_FILE, load_env
from backend.utils.paths import BACKEND_ROOT

logger = logging.getLogger(__name__)

BOOTSTRAP_FILE = BACKEND_ROOT / ".env.bootstrap"

# Bootstrap kopyasından sonra korunacak alanlar (admin oturumu)
_PRESERVE_KEYS = ("ARGOS_ADMIN_USER", "ARGOS_ADMIN_PASSWORD", "ARGOS_JWT_SECRET")


def apply_admin_bootstrap() -> bool:
    """
    backend/.env.bootstrap → backend/.env (API anahtarları).
    Mevcut admin/JWT satırları silinmez.
    """
    if not BOOTSTRAP_FILE.is_file():
        logger.warning("Admin bootstrap: %s bulunamadı", BOOTSTRAP_FILE)
        return False

    preserved: dict[str, str] = {}
    if ENV_FILE.is_file():
        for key, val in dotenv_values(ENV_FILE).items():
            if key in _PRESERVE_KEYS and val:
                preserved[key] = str(val).strip()

    shutil.copyfile(BOOTSTRAP_FILE, ENV_FILE)

    if preserved:
        with ENV_FILE.open("a", encoding="utf-8") as f:
            f.write("\n# Admin oturum (bootstrap sonrası korundu)\n")
            for key, val in preserved.items():
                f.write(f"{key}={val}\n")

    load_env()
    logger.info("Admin bootstrap uygulandı → %s", ENV_FILE)
    return True
