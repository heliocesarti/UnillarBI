import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent


class Cache:
    """Cache em 2 camadas: guarda o resultado de uma consulta pesada em
    memória + arquivo em disco (sobrevive a reinício do processo, evita
    perder minutos de consulta à toa). Cada aba de Estoque que precisa de
    base pesada cria a sua própria instância, com nome e arquivo próprios
    — não é banco de dados, é só cache local, apagar o arquivo é seguro."""

    def __init__(self, name):
        self.name = name
        self._lock = threading.Lock()
        self._state = {"status": "idle", "data": None, "updated_at": None, "error": None, "started_at": None}
        self._file = _BASE_DIR / f".{name}_cache.json"
        self._load_from_disk()

    def _load_from_disk(self):
        if not self._file.exists():
            return
        try:
            with open(self._file, encoding="utf-8") as f:
                saved = json.load(f)
            if saved.get("status") == "ready":
                self._state.update(saved)
        except Exception:
            pass  # cache corrompido ou de outra versão — ignora, recalcula do zero

    def _save_to_disk(self):
        try:
            with open(self._file, "w", encoding="utf-8") as f:
                json.dump(self._state, f, ensure_ascii=False)
        except Exception:
            pass  # não é crítico — só perde a persistência, o app continua

    def get_state(self):
        with self._lock:
            return dict(self._state)

    def start_computing(self):
        """Returns True if this call transitioned idle/ready/error -> computing.
        Returns False if a computation was already in progress (caller should not start another)."""
        with self._lock:
            if self._state["status"] == "computing":
                return False
            self._state["status"] = "computing"
            self._state["error"] = None
            self._state["started_at"] = time.monotonic()
            return True

    def set_ready(self, data):
        with self._lock:
            self._state["status"] = "ready"
            self._state["data"] = data
            self._state["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._state["error"] = None
            self._state["started_at"] = None
            self._save_to_disk()

    def set_error(self, message):
        with self._lock:
            self._state["status"] = "error"
            self._state["error"] = message
            self._state["started_at"] = None


# Nome escolhido pra manter o arquivo `.ruptura_cache.json` já existente em
# disco (não perder o cache pronto que já está lá).
ruptura_cache = Cache("ruptura")
indisponivel_cache = Cache("indisponivel")
excesso_cache = Cache("excesso")
