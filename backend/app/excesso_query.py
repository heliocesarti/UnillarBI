"""Cálculo da análise de Excesso: produtos com estoque parado além do que
as vendas do período justificam, e sem entrada há mais de 90 dias.
Regras passadas pelo usuário (28/08/2026), direto das medidas DAX do
Power BI. Baseado em `z_dw_006` (estoque/custo/venda), `z_dw_002` (vendas,
mesma view que a Ruptura já usa) e `z_dw_023` (entradas de mercadoria,
pra saber há quantos dias um produto não recebe reposição).

Conceitos-chave (nomenclatura igual ao Power BI, pra facilitar auditoria):
  - Estoque geral: soma do saldo do produto na REDE INTEIRA — ignora
    completamente os filtros de Departamento/Local de estoque da tela
    (medida original usa `ALL('z_dw_006')`, ignora inclusive esses
    filtros de visual, não só o contexto de linha).
  - Preço de Venda Unitário: MAX(precovenda) do produto, também ignorando
    os filtros de Departamento/Local (mesmo princípio do Estoque geral).
  - Vendas Período: soma de `z_dw_002.quantidadeproduto` do produto nos
    últimos N dias (N = filtro "Dias selecionado" da tela, 30 a 180).
  - Excesso Estoque = MAX(Estoque geral − Vendas Período, 0).
  - Excesso Estoque (sem entrada 90 dias) = 0 se o produto recebeu
    entrada de mercadoria nos últimos 90 dias, senão = Excesso Estoque.
    "Recebeu entrada" = tem alguma linha em z_dw_023 cuja operação
    realmente MOVE estoque (exclui as poucas cujo `nomeoperacao` já diz
    explicitamente "NÃO MOV ESTOQUE"/"SEM MOVIMENTO ESTOQUE" — não é uma
    suposição, é o que a própria tabela já rotula). Sem nenhuma entrada
    real registrada = conta como "sem entrada há mais de 90 dias".
  - "CustoMedio" (usado nos KPIs/Cards) É diferente do "Estoque geral": é
    o MAX(customedio) só entre as linhas de z_dw_006 que passam no filtro
    de Departamento/Local de CADA visual (por isso existem 2 listas de
    local — "kpi_custo" com 28 itens só pro KPI Preço de custo, e
    "padrao" com 29 itens pros demais) — replica literalmente os filtros
    de visual do Power BI, que podem divergir entre visuais mesmo usando
    a mesma medida.

Mesmo padrão de cache em 2 camadas que Ruptura/Indisponível: compute_base()
pesado (única ida ao banco) + compute_dynamic(dias, filial) instantâneo.
Diferente da 1ª versão desse arquivo: TUDO que não depende de `dias`
(elegibilidade por Departamento/Local, CustoMedio, Estoque geral, Preço de
Venda Unitário, agrupamento por Departamento/Grupo/Marca) já sai pronto de
compute_base() — só entra de novo no ar depois de "Atualizar dados", igual
à Ruptura. compute_dynamic() fica só com o que REALMENTE muda a cada
requisição (Vendas Período da janela escolhida e o filtro de Filial),
sem varrer as ~cem mil linhas de produto+filial+local de novo a cada
troca de filtro — só itera os produtos elegíveis (bem menos) e a lista de
candidatos da tabela, já pré-filtrada."""

from collections import defaultdict
from datetime import date, datetime

from .db import get_connection
from .query_config import get_config

# Linhas de z_dw_023 cujo `nomeoperacao` já diz explicitamente que NÃO
# move estoque de verdade — não contam como "entrada" pra cálculo de dias
# sem reposição. Confirmado direto no banco (só leitura, 28/08/2026) —
# são as únicas 5 de ~20 operações distintas com esse rótulo.
OPERACOES_ENTRADA_EXCLUIDAS = [
    "OPERAÇÃO EMISSÃO NFE ENTRE RAZÕES - NÃO MOV ESTOQUE",
    "EMISSÃO NFE DEVOLUÇÃO AVULSA SEM MOVIMENTO ESTOQUE",
    "ENTRADA ASSIST TECNICA RECEBIDA FORNECEDOR - NAO MOV ESTOQUE",
    "ESTORNO NFE DEVOLUÇÃO FORA PRAZO CGO NAO MOV ESTOQUE",
    "ENTRADA ASSIST TECNICA RECEBIDA AUTORIZADA - NAO MOV ESTOQUE",
]

# Teto da janela de vendas puxada do banco — cobre a maior opção do
# filtro de dias da tela (180) sem puxar mais histórico do que precisa.
DIAS_VENDAS_MAX = 180

# Sentinela pra produto que nunca teve entrada real registrada em
# z_dw_023 — conta como "sem entrada" (> 90 dias) de qualquer jeito.
SEM_ENTRADA_SENTINELA = 999999


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
    """As 3 idas pesadas ao banco (z_dw_006, z_dw_002, z_dw_023), mais
    tudo que NÃO depende do filtro de dias já resolvido aqui em memória
    (uma única vez): elegibilidade por Departamento/Local (2 listas),
    CustoMedio, Estoque geral, Preço de Venda Unitário e a lista de
    candidatos da tabela já filtrada. Lê a config de Excesso (locais/
    departamento excluído) igual a Ruptura lê a config dela aqui — por
    isso mudar essa config também só vale depois de "Atualizar dados"."""
    print("[1/3] Buscando estoque/custo/venda por produto+filial+local (z_dw_006)...")
    linhas_rows = _fetch_rows(
        "SELECT codigoproduto, filialestoqueproduto, localestoqueproduto, "
        "departamentoproduto, grupoproduto, marcaproduto, descricaoproduto, "
        "SUM(saldoestoqueproduto), SUM(customedio), MAX(customedio), MAX(precovenda) "
        "FROM z_dw_006 "
        "GROUP BY codigoproduto, filialestoqueproduto, localestoqueproduto, "
        "departamentoproduto, grupoproduto, marcaproduto, descricaoproduto;"
    )

    print(f"[2/3] Buscando vendas ({DIAS_VENDAS_MAX} dias, z_dw_002)...")
    vendas_rows = _fetch_rows(
        "SELECT codigoproduto, CURRENT_DATE - emissao, SUM(quantidadeproduto) "
        "FROM z_dw_002 WHERE emissao >= CURRENT_DATE - %s "
        "GROUP BY codigoproduto, CURRENT_DATE - emissao;",
        (DIAS_VENDAS_MAX,),
    )
    vendas_db = defaultdict(list)
    for cod, dias_atras, qtd in vendas_rows:
        vendas_db[str(cod)].append({"diasAtras": int(dias_atras), "qtd": float(qtd or 0)})

    print("[3/3] Buscando última entrada real por produto (z_dw_023)...")
    entrada_rows = _fetch_rows(
        "SELECT codigoproduto, MAX(entrada) FROM z_dw_023 "
        "WHERE nomeoperacao IS NULL OR NOT (nomeoperacao = ANY(%s)) "
        "GROUP BY codigoproduto;",
        (OPERACOES_ENTRADA_EXCLUIDAS,),
    )
    ultima_entrada = {str(cod): data_max.isoformat() for cod, data_max in entrada_rows if data_max}

    print("Processando elegibilidade/CustoMedio/agrupamentos (1 passada em memória)...")
    cfg = get_config("excesso")
    departamento_excluido = cfg["departamento_excluido"]
    locais_kpi_custo = set(cfg["locais_kpi_custo"])
    locais_padrao = set(cfg["locais_padrao"])

    estoque_geral = defaultdict(float)
    preco_venda_unit = defaultdict(float)
    custo_max_28 = {}
    custo_max_29 = {}
    deptos_29 = defaultdict(set)
    grupos_29 = defaultdict(set)
    marcas_29 = defaultdict(set)
    candidatos_tabela = []

    for cod, filial, local, depto, grupo, marca, desc, saldo, custo_soma, custo_max, venda_max in linhas_rows:
        cod = str(cod)
        local = (local or "").strip() or "SEM LOCAL"
        depto = (depto or "").strip() or "SEM DEPARTAMENTO"
        grupo = (grupo or "").strip() or "SEM GRUPO"
        marca = (marca or "").strip()
        saldo = float(saldo or 0)
        custo_soma = float(custo_soma or 0)
        custo_max = float(custo_max or 0)
        venda_max = float(venda_max or 0)

        # Estoque geral / Preço de Venda Unitário: SEMPRE globais, ignoram
        # os 2 filtros de visual (equivalente ao `ALL()` do DAX original).
        estoque_geral[cod] += saldo
        preco_venda_unit[cod] = max(preco_venda_unit[cod], venda_max)

        if depto == departamento_excluido:
            continue  # fora dos 2 filtros de visual (28 e 29 listas) igualmente

        if local in locais_kpi_custo:
            custo_max_28[cod] = max(custo_max_28.get(cod, 0.0), custo_max)

        if local in locais_padrao:
            custo_max_29[cod] = max(custo_max_29.get(cod, 0.0), custo_max)
            deptos_29[cod].add(depto)
            grupos_29[cod].add(grupo)
            marcas_29[cod].add(marca)
            candidatos_tabela.append({
                "cod": cod, "filial": str(filial), "local": local,
                "departamento": depto, "grupo": grupo, "marca": marca,
                "desc": (desc or "").strip(), "saldo": saldo, "custoSoma": custo_soma,
            })

    print("Base de Excesso carregada com sucesso!")
    return {
        "vendas_db": dict(vendas_db),
        "ultima_entrada": ultima_entrada,
        "estoque_geral": dict(estoque_geral),
        "preco_venda_unit": dict(preco_venda_unit),
        "custo_max_28": custo_max_28,
        "custo_max_29": custo_max_29,
        "deptos_29": {cod: sorted(s) for cod, s in deptos_29.items()},
        "grupos_29": {cod: sorted(s) for cod, s in grupos_29.items()},
        "marcas_29": {cod: sorted(s) for cod, s in marcas_29.items()},
        "candidatos_tabela": candidatos_tabela,
    }


def _dias_sem_entrada(iso_str):
    if not iso_str:
        return SEM_ENTRADA_SENTINELA
    try:
        d = datetime.fromisoformat(iso_str).date()
    except Exception:
        return SEM_ENTRADA_SENTINELA
    return (date.today() - d).days


def compute_dynamic(base, dias, filial=None):
    """100% em memória, iterando só os produtos elegíveis (não as ~cem mil
    linhas de produto+filial+local) — o único trabalho de verdade aqui é
    Vendas Período pra janela de dias escolhida, que muda a cada request."""
    vendas_db = base.get("vendas_db", {})
    ultima_entrada = base.get("ultima_entrada", {})
    estoque_geral = base.get("estoque_geral", {})
    preco_venda_unit = base.get("preco_venda_unit", {})
    custo_max_28 = base.get("custo_max_28", {})
    custo_max_29 = base.get("custo_max_29", {})
    deptos_29 = base.get("deptos_29", {})
    grupos_29 = base.get("grupos_29", {})
    marcas_29 = base.get("marcas_29", {})
    candidatos_tabela = base.get("candidatos_tabela", [])

    filtro_filial = None if (not filial or filial == "todas") else str(int(filial))

    # Excesso por produto (independe de qual das 2 listas — é sempre
    # global), calculado só pros produtos elegíveis em pelo menos 1 lista.
    excesso_por_cod = {}
    for cod in set(custo_max_28) | set(custo_max_29):
        vendas_periodo = sum(
            v["qtd"] for v in vendas_db.get(cod, [])
            if v["diasAtras"] <= dias
        )
        excesso_bruto = max(estoque_geral.get(cod, 0.0) - vendas_periodo, 0.0)
        dias_sem_entrada = _dias_sem_entrada(ultima_entrada.get(cod))
        excesso_90 = 0.0 if dias_sem_entrada <= 90 else excesso_bruto
        excesso_por_cod[cod] = {
            "vendasPeriodo": vendas_periodo,
            "excessoBruto": excesso_bruto,
            "excesso90": excesso_90,
        }

    # KPIs
    kpi_custo = sum(custo_max_28[cod] * excesso_por_cod[cod]["excesso90"] for cod in custo_max_28)
    kpi_venda = sum(preco_venda_unit.get(cod, 0.0) * excesso_por_cod[cod]["excesso90"] for cod in custo_max_29)
    kpi_produtos_excesso = sum(excesso_por_cod[cod]["excesso90"] for cod in custo_max_29)

    # Cards: Departamento/Grupo/Marca — mesma medida do KPI Preço de
    # custo, só que com a lista de 29 locais (igual ao KPI Preço de
    # venda/Produtos em excesso, não a de 28 do KPI Preço de custo).
    def _agrupar(mapa_dimensao):
        somas = defaultdict(float)
        for cod, valores in mapa_dimensao.items():
            valor = custo_max_29[cod] * excesso_por_cod[cod]["excesso90"]
            for dimensao in valores:
                somas[dimensao] += valor
        return sorted(
            ({"label": k, "value": round(v, 2)} for k, v in somas.items()),
            key=lambda d: -d["value"]
        )

    cards_departamento = _agrupar(deptos_29)
    cards_grupo = _agrupar(grupos_29)
    cards_marca = _agrupar(marcas_29)

    # Tabela: já vem pré-filtrada por Departamento/Local (candidatos_tabela);
    # só falta aplicar Filial (se selecionada) e os 2 filtros de valor
    # (Excesso Estoque > 0 E Estoque excesso sem entrada 90 dias > 0).
    produtos = []
    for l in candidatos_tabela:
        if filtro_filial and l["filial"] != filtro_filial:
            continue
        dados = excesso_por_cod.get(l["cod"])
        if not dados or dados["excessoBruto"] <= 0 or dados["excesso90"] <= 0:
            continue
        cod = l["cod"]
        produtos.append({
            "cod": cod,
            "desc": l["desc"],
            "marca": l["marca"],
            "precoCm": round(l["custoSoma"], 2),
            "totalCmExcesso": round(custo_max_29[cod] * dados["excesso90"], 2),
            "precoVenda": round(preco_venda_unit.get(cod, 0.0), 2),
            "estoqueExcesso": round(dados["excesso90"], 2),
            "filial": l["filial"],
            "estoqueFilial": round(l["saldo"], 2),
            "local": l["local"],
            "departamento": l["departamento"],
            "grupo": l["grupo"],
            "vendasPeriodo": round(dados["vendasPeriodo"], 2),
        })
    produtos.sort(key=lambda p: -p["totalCmExcesso"])

    return {
        "kpis": {
            "custo": round(kpi_custo, 2),
            "venda": round(kpi_venda, 2),
            "produtosExcesso": round(kpi_produtos_excesso, 2),
        },
        "cardsDepartamento": cards_departamento,
        "cardsGrupo": cards_grupo,
        "cardsMarca": cards_marca,
        "produtos": produtos,
        "dias": dias,
    }
