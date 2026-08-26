"""Cálculo real da análise de Ruptura, a partir do banco de produção.

Regras de negócio portadas direto das medidas DAX do Power BI (mandadas
pelo usuário em 25/08) — ver `docs/regras_ruptura.md` para o histórico.
Uma linha por produto (a tabela oficial não quebra por loja). Pontos-chave:

  - Estoque_Atual é da rede inteira (soma de `z_dw_003`, que não tem
    coluna de filial).
  - Total_Vendas_Dinamico também é da rede inteira por padrão; só fica
    restrito a uma filial quando o filtro de Filial da tela seleciona uma
    loja específica (o estoque continua sendo o da rede mesmo assim, já
    que `z_dw_003` não tem como ser filtrado por filial).
  - Entradas/Pedidos pendentes são sempre da rede inteira, sem corte de
    data na quantidade (só a "data mais antiga" usada pra dias de atraso
    tem corte, pra não pegar lixo histórico de anos atrás).
  - Todo produto com Total_Vendas_Dinamico <= 0 no período é sempre "Sem
    risco" — é o "Leão de Chácara" que trava Estoque/Entradas/Pedidos/
    Atrasos em BLANK no DAX original.

Dividido em duas camadas por causa de custo (Modo Power BI In-Memory):
  - compute_base(): Baixa cadastro, estoque, vendas e pendentes agregados
    (por produto, sem aplicar o filtro de dias ainda), salvando tudo na
    memória do Python e no cache JSON.
  - compute_dynamic(base, dias, filial): Faz apenas contas matemáticas
    usando os dados em memória, sem ir ao banco, com resposta instantânea
    — é isso que permite o filtro de dias/filial do topo responder na hora.
"""

from collections import Counter, defaultdict
from datetime import date, datetime

from .db import get_connection
from .query_config import get_config, resolve_periodo

SEVERITY_ORDER = {"EMERGENCIA": 0, "URGENCIA": 1, "ALTA": 2, "MEDIA": 3, "SEM RISCO": 4}

STATUS_LABELS = {
    "EMERGENCIA": "Emergência",
    "URGENCIA": "Urgência",
    "ALTA": "Alta",
    "MEDIA": "Média",
    "SEM RISCO": "Sem risco",
}
RISCO_KEYS = {
    "EMERGENCIA": "emergencia",
    "URGENCIA": "urgencia",
    "ALTA": "alta",
    "MEDIA": "media",
    "SEM RISCO": "sem-risco",
}

# Situação dos itens de pedido considerados "pendentes" (medida
# Pedidos_Pendentes) — trava fixa vinda do DAX, não é mais configurável.
SITUACOES_ITEM_PEDIDO = ["NÃO ENTREGUE", "PARCIAL"]

# Cortes de data usados só pra calcular "dias de atraso" (não afetam a
# quantidade pendente, que é sempre sem corte) — evita que uma nota de
# 2007 esquecida no sistema vire um "atraso de 6000 dias" na tela.
DATA_CORTE_ENTRADA = date(2024, 1, 1)
DATA_CORTE_PEDIDO = date(2015, 1, 1)

# Limites fixos da medida Classificacao_Risco (DAX original — não são mais
# editáveis pela tela, pra nunca mais divergir do Power BI).
LIMITE_ATRASO_PEDIDO = 10
LIMITE_ATRASO_ENTRADA = 20


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


def _classify(estoque, vendas, entradas, pedidos, dias_pedido, dias_entrada, projecao):
    """Tradução 1:1 da medida `Classificacao_Risco` (SWITCH em cascata).
    Assume que a trava tripla de elegibilidade (permitevenda/permitecompra/
    pro_status) e o "Leão de Chácara" de vendas>0 já foram aplicados por
    quem chama — ver compute_dynamic()."""
    if estoque >= vendas and projecao <= 0:
        return "SEM RISCO"
    if (estoque < vendas or projecao > 0) and entradas == 0 and pedidos == 0:
        return "EMERGENCIA"
    if projecao > 0 and dias_pedido > LIMITE_ATRASO_PEDIDO and entradas == 0:
        return "URGENCIA"
    if projecao > 0 and (dias_entrada > LIMITE_ATRASO_ENTRADA or pedidos < projecao):
        return "ALTA"
    if projecao > 0:
        return "MEDIA"
    return "SEM RISCO"


def _avaliar(estoque, vendas, entradas, pedidos, dias_pedido, dias_entrada):
    """Projeção + classificação de um produto. Vendas<=0 é sempre Sem
    Risco, sem exceção (é o "Leão de Chácara" do DAX: sem venda,
    Estoque/Entradas/Pedidos/Atrasos todos ficam BLANK->0, o que sempre
    cai em Sem Risco de qualquer jeito; aqui só encurtamos o caminho)."""
    if vendas <= 0:
        return 0.0, "SEM RISCO"
    projecao = max(vendas - estoque, 0)
    return projecao, _classify(estoque, vendas, entradas, pedidos, dias_pedido, dias_entrada, projecao)


def compute_base():
    """Carrega tudo (Resumos In-Memory) em paralelo para economizar tempo."""
    from concurrent.futures import ThreadPoolExecutor

    cfg = get_config("ruptura")
    data_ini_vendas, data_fim_vendas = resolve_periodo(cfg["vendas_periodo"])

    def get_ativos():
        rows = _fetch_rows(
            "SELECT DISTINCT codigoproduto FROM z_dw_006 WHERE permitecompra = %s AND permitevenda = %s;",
            (cfg["permitecompra"], cfg["permitevenda"]),
        )
        return sorted({str(r[0]) for r in rows})

    def get_produtos():
        rows = _fetch_rows(
            "SELECT produto_codigo, MAX(produto_descricao), MAX(marca_nome), MAX(grupo_nome), "
            "MAX(subgrupo_nome), MAX(departamento_nome), MAX(pro_status) "
            "FROM z_dw_011 GROUP BY produto_codigo;"
        )
        res = {}
        for cod, desc, marca, grupo, subgrupo, depto, pro_status in rows:
            res[str(cod)] = {
                "desc": (desc or "").strip(),
                "marca": (marca or "").strip(),
                "grupo": (grupo or "").strip() or "SEM GRUPO",
                "subgrupo": (subgrupo or "").strip() or "SEM SUBGRUPO",
                "departamento": (depto or "").strip() or "SEM DEPARTAMENTO",
                "pro_status": (pro_status or "").strip(),
            }
        return res

    def get_estoque_rede():
        # Medida Estoque_Atual: SUM de z_dw_003 (essa view não tem coluna
        # de filial — é sempre o saldo da rede inteira por produto).
        rows = _fetch_rows("SELECT codigoproduto, SUM(saldoestoqueproduto) FROM z_dw_003 GROUP BY codigoproduto;")
        return {str(cod): float(saldo or 0) for cod, saldo in rows}

    def get_vendas():
        # Medida Total_Vendas_Dinamico: fica por (produto, filial, dia) pra
        # o filtro de dias do topo recalcular na hora, sem ir ao banco de
        # novo. Por padrão soma a rede inteira; o filtro de Filial (quando
        # não é "todas") restringe pra uma filial só em compute_dynamic().
        rows = _fetch_rows(
            "SELECT filialvenda, codigoproduto, CURRENT_DATE - emissao, SUM(quantidadeproduto) FROM z_dw_002 WHERE emissao BETWEEN %s AND %s GROUP BY filialvenda, codigoproduto, CURRENT_DATE - emissao;",
            (data_ini_vendas, data_fim_vendas),
        )
        res = defaultdict(list)
        for filial, cod, dias_atras, qtd in rows:
            res[str(cod)].append({"filial": str(filial), "dias_atras": int(dias_atras), "qtd": float(qtd or 0)})
        return dict(res)

    def get_entradas():
        # Medida Entradas_Pendentes (quantidade, sem corte de data) +
        # menor data_entrada só entre 2024 em diante (pra Dias_Atraso_Entrada).
        rows = _fetch_rows(
            "SELECT i.codigo_produto, SUM(i.quantidade), MIN(CASE WHEN c.data_entrada >= %s THEN c.data_entrada END) "
            "FROM z_dw_026_itens i "
            "JOIN z_dw_026_capas c ON c.chave_entrada = i.chave_entrada AND c.filial_entrada = i.filial_entrada "
            "WHERE c.situacao = %s AND c.operacao_entrada = %s "
            "GROUP BY i.codigo_produto;",
            (DATA_CORTE_ENTRADA, cfg["situacao_entrada"], cfg["operacao_entrada"]),
        )
        res = {}
        for cod, qtd, data_min in rows:
            res[str(cod)] = {"qtd": float(qtd or 0), "data_min": data_min.isoformat() if data_min else None}
        return res

    def get_pedidos():
        # Medida Pedidos_Pendentes (quantidade_itens, sem corte de data,
        # baseado em situacao_item do próprio item) + menor data_previsao
        # só depois de 2015 (pra Dias_Atraso_Pedido).
        rows = _fetch_rows(
            "SELECT i.codigo_produto, SUM(i.quantidade_itens), MIN(CASE WHEN c.data_previsao > %s THEN c.data_previsao END) "
            "FROM z_dw_029_itens i "
            "JOIN z_dw_029_capas c ON c.chave_pedido = i.chave_pedido AND c.filial_pedido = i.filial_pedido "
            "WHERE i.situacao_item = ANY(%s) "
            "GROUP BY i.codigo_produto;",
            (DATA_CORTE_PEDIDO, SITUACOES_ITEM_PEDIDO),
        )
        res = {}
        for cod, qtd, data_min in rows:
            res[str(cod)] = {"qtd": float(qtd or 0), "data_min": data_min.isoformat() if data_min else None}
        return res

    def get_locais():
        # Só pro filtro de "Local de estoque" da tela — não entra na
        # fórmula de risco (essa usa sempre o estoque da rede, z_dw_003).
        rows = _fetch_rows("SELECT filialestoqueproduto, codigoproduto, localestoqueproduto, SUM(saldoestoqueproduto) FROM z_dw_006 GROUP BY filialestoqueproduto, codigoproduto, localestoqueproduto;")
        res = defaultdict(lambda: defaultdict(list))
        for filial, cod, local, saldo in rows:
            local = (local or "").strip() or "SEM LOCAL"
            res[str(filial)][str(cod)].append(local)
        return dict(res)

    print("[1/6] Buscando Ativos...")
    ativos_res = get_ativos()
    print("[2/6] Buscando Produtos...")
    produtos_res = get_produtos()
    print("[3/6] Buscando Estoque da rede (z_dw_003)...")
    estoque_res = get_estoque_rede()
    print(f"[4/6] Buscando Vendas ({cfg['vendas_periodo']['dias']} dias)...")
    vendas_res = get_vendas()
    print("[5/6] Buscando Entradas e Pedidos pendentes...")
    entradas_res = get_entradas()
    pedidos_res = get_pedidos()
    print("[6/6] Buscando Locais de Estoque...")
    locais_res = get_locais()
    print("Base carregada com sucesso!")

    # Terceira trava de elegibilidade (z_dw_011.pro_status), além de
    # permitecompra/permitevenda já aplicados em get_ativos().
    ativos_res = [
        cod for cod in ativos_res
        if produtos_res.get(cod, {}).get("pro_status") == cfg["pro_status"]
    ]

    return {
        "ativos": ativos_res,
        "produtos": produtos_res,
        "estoque_rede": estoque_res,
        "vendas_db": vendas_res,
        "entradas_db": entradas_res,
        "pedidos_db": pedidos_res,
        "locais_db": locais_res,
    }


def _safe_date(iso_str):
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str).date()
    except Exception:
        return None


def _dias_atraso(data_min, limite_max=None):
    """DATEDIFF(data_min, hoje) só se > 0 (e, pro pedido, também < limite_max
    pra travar número absurdo) — senão BLANK -> 0."""
    if data_min is None:
        return 0
    dias = (date.today() - data_min).days
    if dias <= 0:
        return 0
    if limite_max is not None and dias >= limite_max:
        return 0
    return dias


def compute_dynamic(base, dias, filial=None):
    """Tudo calculado na memória RAM, retorno instantâneo. Uma linha por
    produto — Estoque_Atual é sempre da rede inteira; Total_Vendas_Dinamico
    é da rede inteira, a não ser que `filial` selecione uma loja
    específica (aí só a venda daquela loja entra, o estoque continua
    sendo o da rede)."""
    ativos = set(base["ativos"])
    produtos_cadastro = base.get("produtos", {})
    estoque_rede = base.get("estoque_rede", {})
    vendas_db = base.get("vendas_db", {})
    entradas_db = base.get("entradas_db", {})
    pedidos_db = base.get("pedidos_db", {})
    locais_db = base.get("locais_db", {})

    filtro_filial = None if (not filial or filial == "todas") else str(int(filial))

    produtos_list = []

    for cod in ativos:
        cadastro = produtos_cadastro.get(cod, {})
        estoque = estoque_rede.get(cod, 0.0)

        ent = entradas_db.get(cod, {})
        entradas = ent.get("qtd", 0.0)
        dias_entrada = _dias_atraso(_safe_date(ent.get("data_min")))

        ped = pedidos_db.get(cod, {})
        pedidos = ped.get("qtd", 0.0)
        dias_pedido = _dias_atraso(_safe_date(ped.get("data_min")), limite_max=1500)

        vendas = 0.0
        for venda in vendas_db.get(cod, []):
            if venda["dias_atras"] <= dias and (not filtro_filial or venda["filial"] == filtro_filial):
                vendas += venda["qtd"]

        if vendas <= 0:
            continue  # Leão de Chácara: sem venda no período, sempre Sem Risco — não entra na tabela

        projecao, status = _avaliar(estoque, vendas, entradas, pedidos, dias_pedido, dias_entrada)

        locais = set()
        if filtro_filial:
            locais.update(locais_db.get(filtro_filial, {}).get(cod, []))
        else:
            for fil, cod_dict in locais_db.items():
                locais.update(cod_dict.get(cod, []))

        produtos_list.append({
            "cod": cod,
            "desc": cadastro.get("desc", ""),
            "marca": cadastro.get("marca", ""),
            "departamento": cadastro.get("departamento", "SEM DEPARTAMENTO"),
            "grupo": cadastro.get("grupo", "SEM GRUPO"),
            "subgrupo": cadastro.get("subgrupo", "SEM SUBGRUPO"),
            "estoqueAtual": estoque,
            "totalVendas": vendas,
            "totalEntradaPend": entradas,
            "totalPedidosPend": pedidos,
            "diasPedidosPend": dias_pedido,
            "diasPendEntrada": dias_entrada,
            "projecao": projecao,
            "status": status,
            "locais": sorted(locais),
        })

    em_risco = [p for p in produtos_list if p["status"] != "SEM RISCO"]

    status_counter = Counter(p["status"] for p in produtos_list)
    status_dist = [
        {"key": RISCO_KEYS[s], "label": STATUS_LABELS[s], "value": status_counter.get(s, 0)}
        for s in SEVERITY_ORDER
        if status_counter.get(s, 0) > 0
    ]

    # Contagem de SKUs em ruptura por departamento/grupo — não soma de
    # unidades, pra um produto de altíssimo giro (tijolo, telha) não pesar
    # mais que qualquer outro só por vender em quantidade maior.
    depto_counts = Counter(p["departamento"] for p in em_risco)
    departamento = sorted(
        ({"label": k, "value": v} for k, v in depto_counts.items()),
        key=lambda d: -d["value"]
    )

    grupo_counts = Counter(p["grupo"] for p in em_risco)
    grupo = sorted(
        ({"label": k, "value": v} for k, v in grupo_counts.items()),
        key=lambda d: -d["value"]
    )

    produtos_tabela = sorted(produtos_list, key=lambda p: (SEVERITY_ORDER[p["status"]], -p["projecao"]))
    locais_catalogo = sorted({loc for p in produtos_tabela for loc in p["locais"]})

    return {
        "kpis": {
            "produtosEmRuptura": len(em_risco),
            "totalPendenteEntrada": round(sum(p["totalEntradaPend"] for p in em_risco), 2),
            "totalPedidoPendente": round(sum(p["totalPedidosPend"] for p in em_risco), 2),
            "vendaPerdidaEstimada": None,
        },
        "departamento": departamento,
        "grupo": grupo,
        "status": status_dist,
        "locaisEstoque": locais_catalogo,
        "produtos": [
            {
                "cod": p["cod"],
                "desc": p["desc"], "marca": p["marca"],
                "departamento": p["departamento"], "grupo": p["grupo"], "subgrupo": p["subgrupo"],
                "vendas": p["totalVendas"], "estoque": p["estoqueAtual"],
                "entrada": p["totalEntradaPend"], "risco": RISCO_KEYS[p["status"]],
                "locais": p["locais"],
                "pedidos": p["totalPedidosPend"],
                "diasPedidosPend": p["diasPedidosPend"],
                "diasPendEntrada": p["diasPendEntrada"],
                "projecao": p["projecao"],
            }
            for p in produtos_tabela
        ],
        "produtosTotal": len(produtos_list),
        "produtosAtivosTotal": len(ativos),
        "dias": dias,
        "total": {
            "vendas": round(sum(p["totalVendas"] for p in produtos_list), 2),
            "estoque": round(sum(p["estoqueAtual"] for p in produtos_list), 2),
            "entrada": round(sum(p["totalEntradaPend"] for p in produtos_list), 2),
        },
    }
