"""Cálculo da análise de Indisponível: produtos com estoque parado em
locais que não geram venda (assistência técnica, almoxarifado, devolução,
empréstimo). Baseado só em z_dw_006 (local de estoque + custo médio) e no
cadastro (z_dw_011) — bem mais enxuto que a Ruptura, mas ainda depende da
mesma view pesada (~7min), por isso segue o mesmo padrão de cache em
2 camadas (compute_base pesado e cacheado + compute_dynamic rápido em
memória).

Regras passadas pelo usuário (27/08/2026), direto do relatório Power BI:
  - Produto "indisponível pra venda" = tem estoque num local de uma das 4
    categorias abaixo (coluna z_dw_006.localestoqueproduto). A LISTA de
    locais de cada categoria é configurável pela tela de Configurações
    (`query_config.py`, tela "indisponivel") — só as 4 categorias em si
    (rótulos) são fixas no código.
  - Medida "PREÇO DE CUSTO" = SUM(z_dw_006.customediototal).
"""

from .db import get_connection
from .query_config import get_config

CATEGORIA_LABELS = {
    "assistencia": "Assistência",
    "almoxarifado": "Almoxarifado",
    "devolucao": "Devolução",
    "emprestimo": "Empréstimo",
}


def _fetch_rows(sql, params=None, attempts=3):
    last_error = None
    for attempt in range(1, attempts + 1):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchall()
        except Exception as e:
            last_error = e
        finally:
            conn.close()
    raise last_error


def compute_base():
    """Consulta pesada (mesma view z_dw_006 da Ruptura) — só produtos com
    saldo num dos locais "indisponível" (config atual), com quantidade e
    custo médio total já somados por produto+filial+local. Junta cadastro
    (z_dw_011) pra descrição/marca/departamento/grupo."""
    cfg = get_config("indisponivel")
    locais_por_categoria = cfg["locais_por_categoria"]
    local_para_categoria = {
        local: categoria
        for categoria, locais in locais_por_categoria.items()
        for local in locais
    }
    todos_os_locais = list(local_para_categoria.keys())

    print("[1/2] Buscando estoque parado nos locais indisponíveis (z_dw_006)...")
    rows = _fetch_rows(
        "SELECT filialestoqueproduto, codigoproduto, localestoqueproduto, "
        "SUM(saldoestoqueproduto), SUM(customediototal) "
        "FROM z_dw_006 WHERE localestoqueproduto = ANY(%s) "
        "GROUP BY filialestoqueproduto, codigoproduto, localestoqueproduto;",
        (todos_os_locais,),
    )

    print("[2/2] Buscando cadastro (z_dw_011)...")
    cadastro_rows = _fetch_rows(
        "SELECT produto_codigo, MAX(produto_descricao), MAX(marca_nome), MAX(grupo_nome), "
        "MAX(subgrupo_nome), MAX(departamento_nome) "
        "FROM z_dw_011 GROUP BY produto_codigo;"
    )
    cadastro = {}
    for cod, desc, marca, grupo, subgrupo, depto in cadastro_rows:
        cadastro[str(cod)] = {
            "desc": (desc or "").strip(),
            "marca": (marca or "").strip(),
            "grupo": (grupo or "").strip() or "SEM GRUPO",
            "subgrupo": (subgrupo or "").strip() or "SEM SUBGRUPO",
            "departamento": (depto or "").strip() or "SEM DEPARTAMENTO",
        }

    itens = []
    for filial, cod, local, qtd, custo in rows:
        cod = str(cod)
        c = cadastro.get(cod, {})
        itens.append({
            "filial": str(filial),
            "cod": cod,
            "local": local,
            "categoria": local_para_categoria.get(local, "outros"),
            "quantidade": float(qtd or 0),
            "custo": float(custo or 0),
            "desc": c.get("desc", ""),
            "marca": c.get("marca", ""),
            "departamento": c.get("departamento", "SEM DEPARTAMENTO"),
            "grupo": c.get("grupo", "SEM GRUPO"),
            "subgrupo": c.get("subgrupo", "SEM SUBGRUPO"),
        })

    print("Base de Indisponível carregada com sucesso!")
    return {"itens": itens}


def compute_dynamic(base, filial=None):
    """Tudo em memória: filtra por filial (se informado) e monta KPIs por
    categoria, Cards de custo agrupado e a tabela — sem ir ao banco de novo."""
    itens = base.get("itens", [])
    filtro_filial = None if (not filial or filial == "todas") else str(int(filial))
    if filtro_filial:
        itens = [i for i in itens if i["filial"] == filtro_filial]

    kpis = []
    for chave, label in CATEGORIA_LABELS.items():
        do_grupo = [i for i in itens if i["categoria"] == chave]
        kpis.append({
            "key": chave,
            "label": label,
            "quantidade": round(sum(i["quantidade"] for i in do_grupo), 2),
            "custo": round(sum(i["custo"] for i in do_grupo), 2),
        })

    produtos = [
        {
            "cod": i["cod"],
            "desc": i["desc"],
            "marca": i["marca"],
            "totalCm": round(i["custo"], 2),
            "quantidade": round(i["quantidade"], 2),
            "filial": i["filial"],
            "local": i["local"],
            "departamento": i["departamento"],
            "grupo": i["grupo"],
            "subgrupo": i["subgrupo"],
        }
        for i in itens
    ]
    produtos.sort(key=lambda p: -p["totalCm"])

    return {
        "kpis": kpis,
        "produtos": produtos,
        "totalItens": len(produtos),
        "totalCusto": round(sum(p["totalCm"] for p in produtos), 2),
    }
