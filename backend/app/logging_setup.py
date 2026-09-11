import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_FILE = _LOG_DIR / "app.log"


def setup_logging():
    """Log persistente com rotação (nunca cresce sem limite: 5MB x 5 arquivos).
    Chamado uma única vez, na subida do backend (main.py)."""
    root = logging.getLogger()
    if root.handlers:
        return  # já configurado — evita handler duplicado se chamado 2x
    root.setLevel(logging.INFO)

    fmt = logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")

    _LOG_DIR.mkdir(exist_ok=True)
    file_handler = RotatingFileHandler(_LOG_FILE, maxBytes=5_000_000, backupCount=5, encoding="utf-8")
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(fmt)
    root.addHandler(console_handler)
