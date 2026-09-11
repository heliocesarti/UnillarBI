import logging
import threading
import time

from . import notifier
from .cache import excesso_cache, indisponivel_cache, ruptura_cache

logger = logging.getLogger("unillarbi.watchdog")

CHECK_INTERVAL_SECONDS = 60
# A consulta mais pesada (compute_base) leva ~7min em condições normais, mas já
# levou ~20min com outra consulta pesada concorrente no mesmo Postgres
# (10/09/2026) — 50min dá folga bem maior, alinhado com STATEMENT_TIMEOUT_MS
# em db.py. Passou disso é trava de verdade, não lentidão.
MAX_COMPUTING_SECONDS = 50 * 60

_CACHES = {
    "Ruptura": ruptura_cache,
    "Indisponível": indisponivel_cache,
    "Excesso": excesso_cache,
}


def _loop():
    while True:
        time.sleep(CHECK_INTERVAL_SECONDS)
        for nome, cache in _CACHES.items():
            state = cache.get_state()
            if state["status"] != "computing" or state.get("started_at") is None:
                continue
            elapsed = time.monotonic() - state["started_at"]
            if elapsed <= MAX_COMPUTING_SECONDS:
                continue
            mensagem = (
                f"Atualizacao de {nome} travada ha {elapsed / 60:.0f} min sem terminar "
                f"(limite normal ~7 min). Marcada como erro automaticamente pelo watchdog "
                f"para liberar uma nova tentativa."
            )
            logger.error(mensagem)
            notifier.notify_error(f"Travamento na atualizacao de {nome}", mensagem)
            cache.set_error(mensagem)


def start_watchdog():
    """Detecta uma atualização pendurada em 'computing' pra sempre (achado
    real em 04/09/2026: 1h+ sem terminar, sem erro nenhum) e transforma
    isso num erro de verdade, visível na tela e alertado, em vez de exigir
    alguém reiniciar o backend na mão pra perceber."""
    thread = threading.Thread(target=_loop, daemon=True)
    thread.start()
    logger.info(
        "Watchdog de travamento iniciado (verifica a cada %ss, limite de %s min)",
        CHECK_INTERVAL_SECONDS,
        MAX_COMPUTING_SECONDS / 60,
    )
