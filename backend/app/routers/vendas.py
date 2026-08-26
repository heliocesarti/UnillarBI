from fastapi import APIRouter

from .. import data

router = APIRouter(prefix="/api/vendas", tags=["vendas"])


@router.get("")
def get_vendas():
    return {
        "kpis": data.KPI_VENDAS,
        "vendasPorFilial": data.FILIAIS,
        "heatmap": {"days": data.HEAT_DAYS, "periods": data.HEAT_PERIODS, "matrix": data.HEAT_MATRIX},
    }
