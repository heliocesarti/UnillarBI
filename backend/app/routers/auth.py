from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import auth, auth_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    login: str
    senha: str


@router.post("/login")
def login(body: LoginBody):
    with auth_db.get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM usuarios WHERE login = ? AND ativo = 1",
            (body.login.strip().lower(),),
        ).fetchone()

    if not row or not auth.verificar_senha(body.senha, row["senha_hash"]):
        raise HTTPException(status_code=401, detail="Login ou senha invalidos.")

    usuario = {"login": row["login"], "nome": row["nome"], "papel": row["papel"]}
    return {"token": auth.criar_token(usuario), "usuario": usuario}


@router.get("/me")
def me(usuario: dict = Depends(auth.get_usuario_atual)):
    return usuario
