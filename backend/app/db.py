import os

import psycopg
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Opens a connection locked to read-only at the session level.

    Belt-and-suspenders: even if a bug ever produced an INSERT/UPDATE/DELETE,
    Postgres itself rejects it for this session — the app code never gets
    the chance to write to the homologação database.
    """
    conn = psycopg.connect(
        host=os.environ["PGHOST"],
        port=os.environ.get("PGPORT", 5432),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
        connect_timeout=6,
        # A consulta de Ruptura pode levar minutos — evita que um NAT/firewall
        # no meio do caminho derrube a conexão por parecer "ociosa".
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )
    conn.read_only = True
    return conn
