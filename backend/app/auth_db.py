"""Banco de usuarios (login, hierarquia) do Unillar BI.

Arquivo SQLite proprio (`.app_data.sqlite`, na raiz do backend, fora do
git), separado do Postgres de producao — aquele e' so-leitura de proposito
(ver db.py) e nunca deve guardar dado do app. Usuario e' a unica entidade
persistida aqui por enquanto; log de acesso e feedback entram depois no
mesmo arquivo, quando forem implementados.
"""

import sqlite3
import threading
from pathlib import Path

_DB_FILE = Path(__file__).resolve().parent.parent / ".app_data.sqlite"
_lock = threading.Lock()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _lock, get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                nome TEXT NOT NULL,
                papel TEXT NOT NULL CHECK (papel IN ('admin', 'usuario')),
                ativo INTEGER NOT NULL DEFAULT 1,
                criado_em TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
