from fastapi import APIRouter, Depends

from .. import auth, data

router = APIRouter(prefix="/api/vendas", tags=["vendas"], dependencies=[Depends(auth.get_usuario_atual)])


@router.get("")
def get_vendas():
    return {
        "kpis": data.KPI_VENDAS,
        "vendasPorFilial": data.FILIAIS,
        "heatmap": {"days": data.HEAT_DAYS, "periods": data.HEAT_PERIODS, "matrix": data.HEAT_MATRIX},
    }
