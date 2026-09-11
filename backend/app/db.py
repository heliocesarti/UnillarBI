import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

# Teto pra qualquer consulta individual no banco. As consultas pesadas
# (Ruptura/Indisponível/Excesso) levam ~7min em condições normais, mas já
# levaram ~20min com outra consulta pesada concorrente no mesmo Postgres
# (10/09/2026) — 50min dá folga bem maior pra isso não interromper uma
# sincronização legítima. Sem o timeout, uma trava real do lado do Postgres
# (lock de outra sessão, por exemplo) deixa a consulta pendurada indefinidamente
# sem nunca lançar exceção nenhuma (achado real em 04/09/2026: 1h+ em
# "computing", sem erro, sem uso de CPU). Com o timeout, o próprio Postgres
# cancela e devolve um erro de verdade, que vira log + alerta em vez de silêncio.
STATEMENT_TIMEOUT_MS = 50 * 60 * 1000


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
        autocommit=True,
    )
    conn.read_only = True
    # SET não aceita parâmetro ($1) no Postgres — só literal direto na string.
    # Seguro aqui porque STATEMENT_TIMEOUT_MS é constante interna, não entrada de usuário.
    conn.execute(f"SET statement_timeout = {STATEMENT_TIMEOUT_MS}")
    return conn
