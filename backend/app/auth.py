"""Login, senha e sessao (JWT) do Unillar BI.

Hierarquia hoje e' so 2 papeis: 'admin' (Helio, por enquanto o unico —
unica pessoa com acesso a Sincronizar e a tela de Configuracoes) e
'usuario' (equipe do setor, acesso de leitura aos paineis). Mais
granularidade fica pra quando o acesso for liberado pra mais gente.
"""

import os
import time

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET nao configurado em backend/.env — gere um com: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )
JWT_ALG = "HS256"
TOKEN_TTL_SECONDS = 12 * 60 * 60  # 12h — expira e pede login de novo


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))


def criar_token(usuario: dict) -> str:
    payload = {
        "sub": usuario["login"],
        "nome": usuario["nome"],
        "papel": usuario["papel"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_usuario_atual(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nao autenticado.")
    token = authorization[len("Bearer "):].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessao expirada. Faca login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido.")
    return {"login": payload["sub"], "nome": payload["nome"], "papel": payload["papel"]}


def exigir_admin(usuario: dict = Depends(get_usuario_atual)) -> dict:
    if usuario["papel"] != "admin":
        raise HTTPException(status_code=403, detail="Acao restrita ao administrador.")
    return usuario
