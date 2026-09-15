"""Cria ou atualiza um usuario de login do Unillar BI.

Roda direto no terminal, senha nunca aparece na tela nem fica salva em
nenhum arquivo de historico (usa getpass). Uso:

    venv\\Scripts\\python.exe criar_usuario.py

Se o login ja existir, atualiza nome/senha/papel (permite trocar senha
depois sem precisar de tela propria pra isso ainda).
"""

import getpass
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import auth, auth_db  # noqa: E402


def main():
    auth_db.init_db()

    login = input("Login (sem espaco, ex: helio.cesar): ").strip().lower()
    if not login:
        print("Login vazio, cancelado.")
        return
    nome = input("Nome completo: ").strip()
    if not nome:
        print("Nome vazio, cancelado.")
        return

    papel = ""
    while papel not in ("admin", "usuario"):
        papel = input("Papel (admin/usuario): ").strip().lower()

    senha = getpass.getpass("Senha: ")
    senha_confirma = getpass.getpass("Confirme a senha: ")
    if senha != senha_confirma:
        print("Senhas nao conferem, cancelado.")
        return
    if len(senha) < 6:
        print("Senha muito curta (minimo 6 caracteres), cancelado.")
        return

    senha_hash = auth.hash_senha(senha)

    with auth_db.get_connection() as conn:
        try:
            conn.execute(
                "INSERT INTO usuarios (login, senha_hash, nome, papel) VALUES (?, ?, ?, ?)",
                (login, senha_hash, nome, papel),
            )
            conn.commit()
            print(f"Usuario '{login}' criado com sucesso (papel: {papel}).")
        except sqlite3.IntegrityError:
            resp = input(f"Login '{login}' ja existe. Atualizar nome/senha/papel? (s/n): ").strip().lower()
            if resp != "s":
                print("Cancelado.")
                return
            conn.execute(
                "UPDATE usuarios SET senha_hash = ?, nome = ?, papel = ? WHERE login = ?",
                (senha_hash, nome, papel, login),
            )
            conn.commit()
            print(f"Usuario '{login}' atualizado (papel: {papel}).")


if __name__ == "__main__":
    main()
