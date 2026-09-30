"""Local, atomic persistence of the game setup."""
import json
import math
from pathlib import Path

DEFAULTS = dict(absolute="300", relative="100", max_time="1", color="Slumpa")


def valid(key, value):
    if not isinstance(value, str):
        return False
    if key == "color":
        return value in ("Slumpa", "Vit", "Svart")
    if key == "max_time" and not value.strip():
        return True
    try:
        number = float(value.replace(",", "."))
        if not math.isfinite(number):
            return False
        if key in ("absolute", "relative", "increment"):
            return int(value) >= 0
        return number >= (0.001 if key == "max_time" else 1 / 60)
    except (ValueError, OverflowError):
        return False


def load_settings(path):
    result = DEFAULTS.copy()
    if path is not None:
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
            if isinstance(data, dict):
                result.update({k: v for k, v in data.items() if k in DEFAULTS and valid(k, v)})
        except (OSError, ValueError):
            pass
    return result


def save_settings(path, values):
    if path is None:
        return
    path = Path(path)
    data = load_settings(path)
    data.update({k: v for k, v in values.items() if k in DEFAULTS and valid(k, v)})
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
