"""JSON dosya okuma/yazma — atomik güncelleme."""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def read_json(path: Path, default: Any = None) -> Any:
    """JSON dosyasını okur; yoksa varsayılan döner."""
    try:
        if not path.exists():
            return default if default is not None else {}
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("JSON okuma hatası %s: %s", path, e)
        return default if default is not None else {}


def write_json(path: Path, data: Any) -> None:
    """JSON dosyasına atomik yazar."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp.replace(path)
    except Exception as e:
        logger.error("JSON yazma hatası %s: %s", path, e)
        if tmp.exists():
            tmp.unlink()
        raise
