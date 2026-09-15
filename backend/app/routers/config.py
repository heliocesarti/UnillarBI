from fastapi import APIRouter, Depends, HTTPException

from .. import auth, config_registry, query_config

router = APIRouter(prefix="/api/config", tags=["config"], dependencies=[Depends(auth.get_usuario_atual)])


@router.get("")
def get_all_config():
    return query_config.get_all_config()


@router.get("/registry")
def get_registry():
    """Mapa de ambientes/módulos (com status disponível/pendente) que a
    tela de Configurações usa pra montar a navegação."""
    return config_registry.get_registry()


@router.put("/ruptura")
def update_ruptura_config(cfg: dict, usuario: dict = Depends(auth.exigir_admin)):
    try:
        query_config.validate_ruptura_config(cfg)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    query_config.save_config("ruptura", cfg)
    return query_config.get_config("ruptura")


@router.post("/ruptura/reset")
def reset_ruptura_config(usuario: dict = Depends(auth.exigir_admin)):
    return query_config.reset_config("ruptura")


@router.put("/indisponivel")
def update_indisponivel_config(cfg: dict, usuario: dict = Depends(auth.exigir_admin)):
    try:
        query_config.validate_indisponivel_config(cfg)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    query_config.save_config("indisponivel", cfg)
    return query_config.get_config("indisponivel")


@router.post("/indisponivel/reset")
def reset_indisponivel_config(usuario: dict = Depends(auth.exigir_admin)):
    return query_config.reset_config("indisponivel")


@router.put("/visibilidade")
def update_visibilidade_config(cfg: dict, usuario: dict = Depends(auth.exigir_admin)):
    try:
        query_config.validate_visibilidade_config(cfg)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    query_config.save_config("visibilidade", cfg)
    return query_config.get_config("visibilidade")


@router.post("/visibilidade/reset")
def reset_visibilidade_config(usuario: dict = Depends(auth.exigir_admin)):
    return query_config.reset_config("visibilidade")
