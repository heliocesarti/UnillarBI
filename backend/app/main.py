import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import error_reporting
from .logging_setup import setup_logging
from .routers import config, estoque, financeiro, vendas, visao_geral
from .watchdog import start_watchdog

setup_logging()
logger = logging.getLogger("unillarbi.main")

app = FastAPI(title="Unillar BI API")

cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Content-Type"],
    )

app.include_router(visao_geral.router)
app.include_router(vendas.router)
app.include_router(estoque.router)
app.include_router(financeiro.router)
app.include_router(config.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    error_reporting.report_exception(f"Erro nao tratado em {request.method} {request.url.path}", exc)
    return JSONResponse(status_code=500, content={"detail": "Erro interno. Ja foi registrado para investigacao."})


@app.on_event("startup")
def _on_startup():
    logger.info("Backend iniciado.")
    start_watchdog()


@app.get("/api/health")
def health():
    return {"status": "ok", "postgres": "connected (ruptura only)", "source": "mixed"}
