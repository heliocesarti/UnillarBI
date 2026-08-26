import threading

from fastapi import APIRouter

from .. import data, ruptura_query
from ..cache import get_state, set_error, set_ready, start_computing

router = APIRouter(prefix="/api/estoque", tags=["estoque"])


@router.get("/geral")
def get_estoque_geral():
    return {
        "kpis": data.KPI_ESTOQUE_GERAL,
        "estoquePorCategoria": data.ESTOQUE_CAT,
        "ocupacaoCdPercent": 78,
    }


def _run_base_computation():
    try:
        result = ruptura_query.compute_base()
        set_ready(result)
    except Exception as e:
        set_error(f"{type(e).__name__}: {e}")


@router.get("/ruptura")
def get_estoque_ruptura(dias: int = 60, filial: str = "todas"):
    state = get_state()
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


@router.post("/ruptura/atualizar")
def atualizar_ruptura():
    started = start_computing()
    if not started:
        return {"status": "computing", "message": "Já existe uma atualização em andamento."}
    thread = threading.Thread(target=_run_base_computation, daemon=True)
    thread.start()
    return {"status": "computing", "message": "Atualização iniciada. Pode levar alguns minutos."}
