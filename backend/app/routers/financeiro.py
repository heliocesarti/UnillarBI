from fastapi import APIRouter

from .. import data

router = APIRouter(prefix="/api/financeiro", tags=["financeiro"])


@router.get("")
def get_financeiro():
    return {
        "kpis": data.KPI_FINANCEIRO,
        "fluxoCaixa": {"meses": data.FLUXO_MESES, "entradas": data.FLUXO_ENTRADAS, "saidas": data.FLUXO_SAIDAS},
        "comprometimentoObrigacoes": data.COMPROMETIMENTO,
    }
