"""Dosya yolu yardımcıları."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_ROOT / "data"
LOGS_DIR = BACKEND_ROOT / "logs"

PORTFOLIO_FILE = DATA_DIR / "portfolio.json"
ALERTS_FILE = DATA_DIR / "alerts.json"
ALERTS_LOG_FILE = DATA_DIR / "alerts_log.json"
CHAT_HISTORY_FILE = DATA_DIR / "chat_history.json"
