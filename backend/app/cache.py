import json
import threading
from datetime import datetime, timezone
from pathlib import Path

_lock = threading.Lock()

# status: "idle" (never computed) | "computing" | "ready" | "error"
_state = {"status": "idle", "data": None, "updated_at": None, "error": None}

# Persiste em disco pra não perder ~7min de consulta toda vez que o
# processo reinicia (ex: durante desenvolvimento). Não é banco de dados,
# é só um cache local — apagar o arquivo é seguro a qualquer momento.
_CACHE_FILE = Path(__file__).resolve().parent.parent / ".ruptura_cache.json"


def _load_from_disk():
    if not _CACHE_FILE.exists():
        return
    try:
        with open(_CACHE_FILE, encoding="utf-8") as f:
            saved = json.load(f)
        if saved.get("status") == "ready":
            _state.update(saved)
    except Exception:
        pass  # cache corrompido ou de outra versão — ignora, recalcula do zero


def _save_to_disk():
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_state, f, ensure_ascii=False)
    except Exception:
        pass  # não é crítico — só perde a persistência, o app continua


_load_from_disk()


def get_state():
    with _lock:
        return dict(_state)


def start_computing():
    """Returns True if this call transitioned idle/ready/error -> computing.
    Returns False if a computation was already in progress (caller should not start another)."""
    with _lock:
        if _state["status"] == "computing":
            return False
        _state["status"] = "computing"
        _state["error"] = None
        return True


def set_ready(data):
    with _lock:
        _state["status"] = "ready"
        _state["data"] = data
        _state["updated_at"] = datetime.now(timezone.utc).isoformat()
        _state["error"] = None
        _save_to_disk()


def set_error(message):
    with _lock:
        _state["status"] = "error"
        _state["error"] = message
