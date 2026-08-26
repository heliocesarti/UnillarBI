from fastapi import APIRouter

from .. import data

router = APIRouter(prefix="/api/visao-geral", tags=["visao-geral"])


@router.get("")
def get_visao_geral():
    return {
        "kpis": data.KPI_VISAO_GERAL,
        "faturamentoMensal": {"labels": data.MONTHS, "values": data.FATURAMENTO},
        "vendasPorCategoria": data.CATEGORIAS,
    }
