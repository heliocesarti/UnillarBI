import logging
import threading
import time

from fastapi import APIRouter, Depends

from .. import auth, data, error_reporting, excesso_query, indisponivel_query, ruptura_query
from ..cache import excesso_cache, indisponivel_cache, ruptura_cache

logger = logging.getLogger("unillarbi.estoque")

router = APIRouter(prefix="/api/estoque", tags=["estoque"], dependencies=[Depends(auth.get_usuario_atual)])


@router.get("/geral")
def get_estoque_geral():
    return {
        "kpis": data.KPI_ESTOQUE_GERAL,
        "estoquePorCategoria": data.ESTOQUE_CAT,
        "ocupacaoCdPercent": 78,
    }


def _run_ruptura_base_computation():
    inicio = time.monotonic()
    try:
        result = ruptura_query.compute_base()
        ruptura_cache.set_ready(result)
        logger.info("Atualizacao da Ruptura concluida em %.1fs", time.monotonic() - inicio)
    except Exception as e:
        resumo = error_reporting.report_exception("Atualizacao da Ruptura", e)
        ruptura_cache.set_error(resumo)


@router.get("/ruptura")
def get_estoque_ruptura(dias: int = 60, filial: str = "todas"):
    state = ruptura_cache.get_state()
    if state["status"] != "ready":
        return {
            "status": state["status"],
            "data": None,
            "updatedAt": state["updated_at"],
            "error": state["error"],
        }

    # O compute_dynamic agora é 100% In-Memory (modo Power BI).
    # Roda em milissegundos matematicamente, sem precisar de TTL ou ir ao banco!
    try:
        computed = ruptura_query.compute_dynamic(state["data"], dias, filial)
    except Exception as e:
        return {"status": "error", "data": None, "updatedAt": state["updated_at"], "error": f"{type(e).__name__}: {e}"}

    return {"status": "ready", "data": computed, "updatedAt": state["updated_at"], "error": None}


@router.get("/ruptura/classificacoes")
def get_ruptura_classificacoes():
    # Catálogo de Departamento/Grupo/Subgrupo pra alimentar seletores de
    # múltipla escolha (filtro da Ruptura e exceções do Aglutinar em
    # Configurações) — direto da base já cacheada, sem ida nova ao banco.
    state = ruptura_cache.get_state()
    if state["status"] != "ready":
        return {"departamentos": [], "grupos": [], "subgrupos": []}
    produtos = state["data"].get("produtos", {})
    return {
        "departamentos": sorted({p["departamento"] for p in produtos.values()}, key=lambda v: v.lower()),
        "grupos": sorted({p["grupo"] for p in produtos.values()}, key=lambda v: v.lower()),
        "subgrupos": sorted({p["subgrupo"] for p in produtos.values()}, key=lambda v: v.lower()),
    }


@router.post("/ruptura/atualizar")
def atualizar_ruptura(usuario: dict = Depends(auth.exigir_admin)):
    started = ruptura_cache.start_computing()
    if not started:
        return {"status": "computing", "message": "Já existe uma atualização em andamento."}
    thread = threading.Thread(target=_run_ruptura_base_computation, daemon=True)
    thread.start()
    return {"status": "computing", "message": "Atualização iniciada. Pode levar alguns minutos."}


def _run_indisponivel_base_computation():
    inicio = time.monotonic()
    try:
        result = indisponivel_query.compute_base()
        indisponivel_cache.set_ready(result)
        logger.info("Atualizacao da Indisponivel concluida em %.1fs", time.monotonic() - inicio)
    except Exception as e:
        resumo = error_reporting.report_exception("Atualizacao da Indisponivel", e)
        indisponivel_cache.set_error(resumo)


@router.get("/indisponivel")
def get_estoque_indisponivel(filial: str = "todas"):
    state = indisponivel_cache.get_state()
    if state["status"] != "ready":
        return {
            "status": state["status"],
            "data": None,
            "updatedAt": state["updated_at"],
            "error": state["error"],
        }

    try:
        computed = indisponivel_query.compute_dynamic(state["data"], filial)
    except Exception as e:
        return {"status": "error", "data": None, "updatedAt": state["updated_at"], "error": f"{type(e).__name__}: {e}"}

    return {"status": "ready", "data": computed, "updatedAt": state["updated_at"], "error": None}


@router.post("/indisponivel/atualizar")
def atualizar_indisponivel(usuario: dict = Depends(auth.exigir_admin)):
    started = indisponivel_cache.start_computing()
    if not started:
        return {"status": "computing", "message": "Já existe uma atualização em andamento."}
    thread = threading.Thread(target=_run_indisponivel_base_computation, daemon=True)
    thread.start()
    return {"status": "computing", "message": "Atualização iniciada. Pode levar alguns minutos."}


def _run_excesso_base_computation():
    inicio = time.monotonic()
    try:
        result = excesso_query.compute_base()
        excesso_cache.set_ready(result)
        logger.info("Atualizacao do Excesso concluida em %.1fs", time.monotonic() - inicio)
    except Exception as e:
        resumo = error_reporting.report_exception("Atualizacao do Excesso", e)
        excesso_cache.set_error(resumo)


@router.get("/excesso")
def get_estoque_excesso(dias: int = 60, filial: str = "todas"):
    state = excesso_cache.get_state()
    if state["status"] != "ready":
        return {
            "status": state["status"],
            "data": None,
            "updatedAt": state["updated_at"],
            "error": state["error"],
        }

    try:
        computed = excesso_query.compute_dynamic(state["data"], dias, filial)
    except Exception as e:
        return {"status": "error", "data": None, "updatedAt": state["updated_at"], "error": f"{type(e).__name__}: {e}"}

    return {"status": "ready", "data": computed, "updatedAt": state["updated_at"], "error": None}


@router.post("/excesso/atualizar")
def atualizar_excesso(usuario: dict = Depends(auth.exigir_admin)):
    started = excesso_cache.start_computing()
    if not started:
        return {"status": "computing", "message": "Já existe uma atualização em andamento."}
    thread = threading.Thread(target=_run_excesso_base_computation, daemon=True)
    thread.start()
    return {"status": "computing", "message": "Atualização iniciada. Pode levar alguns minutos."}
