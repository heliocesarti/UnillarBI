from fastapi import APIRouter, HTTPException

from .. import query_config

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def get_all_config():
    return query_config.get_all_config()


@router.put("/ruptura")
def update_ruptura_config(cfg: dict):
    try:
        query_config.validate_ruptura_config(cfg)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    query_config.save_config("ruptura", cfg)
    return query_config.get_config("ruptura")


@router.post("/ruptura/reset")
def reset_ruptura_config():
    return query_config.reset_config("ruptura")
