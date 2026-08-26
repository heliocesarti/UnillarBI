from fastapi import FastAPI

from .routers import config, estoque, financeiro, vendas, visao_geral

app = FastAPI(title="Unillar BI API")

app.include_router(visao_geral.router)
app.include_router(vendas.router)
app.include_router(estoque.router)
app.include_router(financeiro.router)
app.include_router(config.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "postgres": "connected (ruptura only)", "source": "mixed"}
