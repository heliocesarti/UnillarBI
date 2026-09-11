import logging
import traceback

from . import notifier

logger = logging.getLogger("unillarbi.errors")


def report_exception(contexto: str, exc: Exception) -> str:
    """Ponto único pra tratar qualquer erro real do backend: loga o
    traceback completo (não só o resumo) e dispara o alerta externo, se
    configurado. Retorna o resumo de 1 linha (mesmo texto que já ia pro
    estado de erro mostrado na tela)."""
    tb = traceback.format_exc()
    logger.error("Falha em %s\n%s", contexto, tb)
    notifier.notify_error(contexto, tb)
    return f"{type(exc).__name__}: {exc}"
