from fastapi import APIRouter, Depends

from .. import auth, data

router = APIRouter(prefix="/api/visao-geral", tags=["visao-geral"], dependencies=[Depends(auth.get_usuario_atual)])


@router.get("")
def get_visao_geral():
    return {
        "kpis": data.KPI_VISAO_GERAL,
        "faturamentoMensal": {"labels": data.MONTHS, "values": data.FATURAMENTO},
        "vendasPorCategoria": data.CATEGORIAS,
    }
