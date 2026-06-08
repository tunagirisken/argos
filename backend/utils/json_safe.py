"""JSON serileştirme için NaN/Inf ve numpy skaler temizliği."""

import math
from typing import Any

import numpy as np


def sanitize_for_json(obj: Any) -> Any:
    """NaN/Inf değerlerini None yapar; numpy skalerlerini native tipe çevirir."""
    if obj is None or isinstance(obj, (str, bool, int)):
        return obj
    if isinstance(obj, (float, np.floating)):
        v = float(obj)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(v) for v in obj]
    return obj
