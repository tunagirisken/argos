"""Günlük dosyaya loglama yapılandırması."""

import logging
from datetime import datetime

from backend.utils.paths import LOGS_DIR


def setup_logging(level: str = "INFO") -> None:
    """logs/argos_YYYY-MM-DD.log dosyasına yazar."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"argos_{datetime.now().strftime('%Y-%m-%d')}.log"

    root = logging.getLogger()
    if root.handlers:
        return

    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(fmt)
    root.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    root.addHandler(ch)
