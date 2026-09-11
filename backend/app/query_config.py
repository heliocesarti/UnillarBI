"""Configuração de período/situação usada pelas consultas pesadas.

Objetivo: nenhuma consulta deve ter janela de data ou filtro de status
fixo no código-fonte — tudo fica aqui, editável pela tela Configurações,
sem precisar mexer em Python. Muda o valor, clica em "Atualizar dados" de
novo, pronto.

`vendas_periodo` é um dict com um `modo` (usado só pra limitar a janela
de vendas puxada do banco — entradas/pedidos pendentes não têm corte de
data, sempre traz tudo que ainda está pendente):
  - "dias": últimos N dias até hoje (N em `dias`)
  - "mes_atual": do dia 1 do mês corrente até hoje
  - "ano_atual": de 1º de janeiro do ano corrente até hoje
  - "livre": de `data_inicio` até `data_fim` (data_fim vazio = hoje)
"""

import json
import threading
from datetime import date, datetime, timedelta
from pathlib import Path

_lock = threading.Lock()

_CONFIG_FILE = Path(__file__).resolve().parent.parent / ".query_config.json"

MODOS_VALIDOS = {"dias", "mes_atual", "ano_atual", "livre"}

# Valores reais confirmados direto no banco (só leitura) — usados pra
# validar os campos de múltipla escolha abaixo.
SITUACOES_PEDIDO_VALIDAS = {"CANCELADO", "ENTREGUE", "NÃO ENTREGUE", "PARCIAL"}
RISCOS_VALIDOS = {"ruptura", "emergencia", "urgencia", "alta", "media", "sem-risco"}
DIAS_TELA_VALIDOS = {"7", "30", "60", "90", "12m"}
SEPARADORES_CSV_VALIDOS = {";", ","}
COLUNAS_EXPORT_VALIDAS = {
    "cod", "desc", "marca", "vendas", "estoque", "entrada", "pedidos",
    "diasPedidosPend", "diasPendEntrada", "projecao", "departamento",
    "grupo", "subgrupo", "risco",
}

# Catálogo completo de locais de estoque que existem hoje em
# z_dw_006.localestoqueproduto (conferido direto no banco, só leitura, em
# 27/08/2026) — usado tanto pra validar a config de Indisponível quanto
# pra popular a lista de opções na tela.
LOCAIS_ESTOQUE_VALIDOS = {
    "ALMOXARIFADO [01]", "ALMOXARIFADO [06]", "ALMOXARIFADO [07]",
    "ASSIST TECNICA LJ P. DUTRA", "ASSIT TEC AUTZDA [01]", "ASSIT TEC DP [01]",
    "BALCAO ENTREGA CALCADOS [01]", "CALÇADOS PROMOÇÃO [01]",
    "DEP ALFAVILE [01]", "DEP CALÇADOS [01]", "DEP LJ CEL SALA 01 [01]",
    "DEP LOJA MOV ELET [01]", "DEP LOJA PNEUS [01]", "DEP P. DUTRA [09]",
    "DEVOLUÇÃO [06]", "DEVOLUÇÃO P. DUTRA [09]",
    "EMPRÉSTIMO", "EMPRESTIMO [01]", "EMPRESTIMO [06]", "EMPRESTIMO P. DUTRA",
    "FORNECEDOR [01]", "LOJA [01]", "LOJA ESPERANTINOPOLIS", "LOJA ITAIPAVA",
    "LOJA JENIPAPO DOS VIEIRAS", "LOJA P. DUTRA [09]", "OFICINA PIT STOP [01]",
    "PISOS DIVERSOS", "PONTA DE ESTOQUE", "PROMOÇÃO P. DUTRA [09]",
    "RESERVADO SORTEIOS [01]", "SALDÃO DEP ALFAVILE [01]", "SALDÃO ESPERANT [06]",
    "SEMI NOVO ALFAVILE [01]", "SEMI NOVO ESPERANTINOPOLIS", "SEMI NOVO ITAIPAVA",
    "SEMI NOVO JENIPAPO DOS VIEIRAS", "SEMI NOVO LOJA [01]", "SEMI NOVO P. DUTRA [09]",
    "TRIAGEM AVARIA/DEVOLUÇÃO[06]", "UNIZAP [02]", "V EX 01 [01]", "V EX 03 [01]",
}

CATEGORIAS_INDISPONIVEL_VALIDAS = {"assistencia", "almoxarifado", "devolucao", "emprestimo"}

DIAS_EXCESSO_VALIDOS = {"30", "60", "90", "120", "150", "180"}

# Sub-abas reais de Estoque (chaves idênticas a `SUBTABS` em
# frontend/src/views/estoque/Estoque.jsx) — usado pra validar quais podem
# ser ocultadas do menu ao vivo pela tela de Visibilidade.
ESTOQUE_SUBTABS_VALIDAS = {
    "geral", "sem-giro", "ultimo-estoque", "inativo-compra",
    "margem", "excesso", "indisponivel", "ruptura",
}

# Locais usados nos 2 filtros de visual da tela Excesso (mandados pelo
# usuário direto do Power BI em 28/08/2026, conferidos contra o catálogo
# real acima). "locais_kpi_custo" (28 itens) só vale pro KPI "Preço de
# custo"; "locais_padrao" (29 itens = os mesmos 28 + Devolução P. Dutra)
# vale pro KPI "Preço de venda", KPI "Produtos em excesso", os 3 Cards e a
# tabela — inconsistência confirmada 2x com o usuário, não é engano.
LOCAIS_EXCESSO_KPI_CUSTO = [
    "BALCAO ENTREGA CALCADOS [01]", "CALÇADOS PROMOÇÃO [01]",
    "DEP ALFAVILE [01]", "DEP CALÇADOS [01]", "DEP LJ CEL SALA 01 [01]",
    "DEP LOJA MOV ELET [01]", "DEP LOJA PNEUS [01]", "DEP P. DUTRA [09]",
    "FORNECEDOR [01]", "LOJA [01]", "LOJA ESPERANTINOPOLIS", "LOJA ITAIPAVA",
    "LOJA JENIPAPO DOS VIEIRAS", "LOJA P. DUTRA [09]", "OFICINA PIT STOP [01]",
    "PISOS DIVERSOS", "PONTA DE ESTOQUE", "PROMOÇÃO P. DUTRA [09]",
    "RESERVADO SORTEIOS [01]", "SALDÃO DEP ALFAVILE [01]",
    "SEMI NOVO ALFAVILE [01]", "SEMI NOVO ESPERANTINOPOLIS", "SEMI NOVO ITAIPAVA",
    "SEMI NOVO LOJA [01]", "TRIAGEM AVARIA/DEVOLUÇÃO[06]", "UNIZAP [02]",
    "V EX 01 [01]", "V EX 03 [01]",
]
LOCAIS_EXCESSO_PADRAO = LOCAIS_EXCESSO_KPI_CUSTO + ["DEVOLUÇÃO P. DUTRA [09]"]

DEFAULT_CONFIG = {
    "ruptura": {
        # Teto fixo de 1 ano — cobre a maior opção do filtro de dias do
        # topbar (12m = 365 dias) sem puxar mais histórico de vendas do
        # que o necessário (consulta pesada, não vale sobrecarregar).
        "vendas_periodo": {"modo": "dias", "dias": 365, "data_inicio": None, "data_fim": None},
        "situacao_entrada": "PENDENTE",
        "operacao_entrada": "Entrada por COMPRA",
        "permitecompra": "A",
        "permitevenda": "A",
        # Terceira trava de elegibilidade (z_dw_011) além de permitecompra/permitevenda.
        "pro_status": "A",
        # Medida Pedidos_Pendentes: quais situações de item de pedido
        # contam como "a caminho". Valor abaixo reproduz exatamente o
        # comportamento fixo que existia antes disso virar parâmetro.
        "situacoes_pedido_pendente": ["NÃO ENTREGUE", "PARCIAL"],
        # Janela de "quando o documento foi emitido" (z_dw_026_capas /
        # z_dw_029_capas .data_emissao) pra Pendente Entrada e Pedido
        # Pendente — igual a `vendas_periodo`, cada um independente.
        # Restaurado em 28/08/2026: essa era a regra original mandada pelo
        # usuário (corte de 1 ano na medida `Qtd_Total_Pendentes`), que
        # tinha se perdido na implementação — sem isso, nota antiga nunca
        # baixada ficava contando pra sempre.
        "entrada_periodo": {"modo": "dias", "dias": 365, "data_inicio": None, "data_fim": None},
        "pedido_periodo": {"modo": "dias", "dias": 365, "data_inicio": None, "data_fim": None},
        # Feature Aglutinar (sugestão de substitutos na Ruptura).
        "aglutinar_ligado_por_padrao": True,
        "aglutinar_prefixo_palavras": 3,
        # Exceções ao valor global acima, por Departamento/Grupo/Subgrupo
        # (pedido pelo usuário em 02/09/2026). Cada item: {nivel, valores,
        # palavras} — "valores" é uma lista (múltipla escolha: pode marcar
        # mais de um Departamento/Grupo/Subgrupo pra valer o mesmo nº de
        # palavras). Resolução por especificidade — subgrupo vence grupo,
        # que vence departamento, que vence o valor global — ver
        # `_n_palavras_para` em ruptura_query.py.
        "aglutinar_prefixo_excecoes": [],
        # Preferências de tela ao abrir a aba Ruptura (não mudam cálculo
        # nenhum, só o estado inicial dos filtros/gráficos).
        "tela_dias_padrao": "60",
        "tela_filial_padrao": "todas",
        "tela_riscos_padrao": ["ruptura", "emergencia", "urgencia", "alta", "media", "sem-risco"],
        "grafico_truncar_rotulo": 8,
        # Exportação em Excel/CSV da tabela de Ruptura.
        "export_separador_csv": ";",
        "export_colunas": [
            "cod", "desc", "marca", "vendas", "estoque", "entrada", "pedidos",
            "diasPedidosPend", "diasPendEntrada", "projecao", "departamento",
            "grupo", "subgrupo", "risco",
        ],
    },
    "excesso": {
        # Departamento fora da análise (os 2 filtros de visual do Power
        # BI, mandados pelo usuário em 28/08/2026 — confirmado direto no
        # banco). Locais das 2 listas ficam em LOCAIS_EXCESSO_KPI_CUSTO/
        # LOCAIS_EXCESSO_PADRAO acima (não duplicado aqui).
        "departamento_excluido": "ALMOXARIFADO",
        "locais_kpi_custo": list(LOCAIS_EXCESSO_KPI_CUSTO),
        "locais_padrao": list(LOCAIS_EXCESSO_PADRAO),
        "dias_selecionado_padrao": "60",
    },
    "indisponivel": {
        # Locais que definem "produto indisponível pra venda", agrupados
        # nas 4 categorias que viram as 4 KPIs da tela. Valores abaixo são
        # os confirmados direto no banco a partir do que o usuário mandou
        # (27/08/2026) — "devolucao" ficou só com 1 local porque os outros
        # 4 que foram mencionados não bateram com nenhum nome real; dá pra
        # completar direto na tela de Configurações escolhendo da lista.
        "locais_por_categoria": {
            "assistencia": ["ASSIST TECNICA LJ P. DUTRA", "ASSIT TEC AUTZDA [01]", "ASSIT TEC DP [01]"],
            "almoxarifado": ["ALMOXARIFADO [01]", "ALMOXARIFADO [06]", "ALMOXARIFADO [07]"],
            "devolucao": ["DEVOLUÇÃO [06]"],
            "emprestimo": ["EMPRÉSTIMO", "EMPRESTIMO [01]", "EMPRESTIMO [06]", "EMPRESTIMO P. DUTRA"],
        },
    },
    "visibilidade": {
        # Sub-abas de Estoque escondidas do MENU AO VIVO (a tela real que o
        # usuário final usa) — não apaga nada, só tira da navegação e do
        # roteamento enquanto estiver na lista. Toda a lógica/dado por trás
        # continua intacto (inclusive esta própria config em Configurações),
        # só a aba some do menu de Estoque. Vazio = tudo visível (padrão de
        # fábrica). "ruptura" nunca pode entrar aqui — ver
        # `validate_visibilidade_config`.
        "estoque_subtabs_ocultas": [],
    },
}


def _merge_defaults(saved, defaults):
    """Preenche com o default qualquer chave que falte no que foi salvo
    (permite adicionar campo novo depois sem quebrar config antiga)."""
    if not isinstance(saved, dict):
        return defaults
    merged = dict(defaults)
    for key, default_value in defaults.items():
        if key in saved:
            if isinstance(default_value, dict):
                merged[key] = _merge_defaults(saved[key], default_value)
            else:
                merged[key] = saved[key]
    return merged


def _load_from_disk():
    if not _CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with open(_CONFIG_FILE, encoding="utf-8") as f:
            saved = json.load(f)
        return {
            tela: _merge_defaults(saved.get(tela), defaults)
            for tela, defaults in DEFAULT_CONFIG.items()
        }
    except Exception:
        return dict(DEFAULT_CONFIG)  # arquivo corrompido — volta pro padrão


_config = _load_from_disk()


def _save_to_disk():
    try:
        with open(_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(_config, f, ensure_ascii=False, indent=2)
    except Exception:
        pass  # não é crítico — só não persiste, continua valendo em memória


def get_config(tela="ruptura"):
    with _lock:
        return json.loads(json.dumps(_config[tela]))  # cópia profunda


def get_all_config():
    with _lock:
        return json.loads(json.dumps(_config))


def save_config(tela, novo_valor):
    with _lock:
        _config[tela] = novo_valor
        _save_to_disk()


def reset_config(tela):
    with _lock:
        _config[tela] = json.loads(json.dumps(DEFAULT_CONFIG[tela]))
        _save_to_disk()
        return _config[tela]


def _parse_iso_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


def resolve_periodo(periodo_cfg):
    """Retorna (data_inicio, data_fim) como objetos date, prontos pra ir
    direto num parâmetro de query SQL."""
    hoje = date.today()
    modo = periodo_cfg.get("modo", "dias")

    if modo == "dias":
        dias = int(periodo_cfg.get("dias") or 1)
        return hoje - timedelta(days=dias), hoje

    if modo == "mes_atual":
        return hoje.replace(day=1), hoje

    if modo == "ano_atual":
        return hoje.replace(month=1, day=1), hoje

    if modo == "livre":
        data_inicio = _parse_iso_date(periodo_cfg["data_inicio"])
        data_fim_raw = periodo_cfg.get("data_fim")
        data_fim = _parse_iso_date(data_fim_raw) if data_fim_raw else hoje
        return data_inicio, data_fim

    raise ValueError(f"modo de período inválido: {modo!r}")


def validate_periodo(periodo_cfg):
    modo = periodo_cfg.get("modo")
    if modo not in MODOS_VALIDOS:
        raise ValueError(f"modo deve ser um de {sorted(MODOS_VALIDOS)}, recebido {modo!r}")
    if modo == "dias":
        dias = periodo_cfg.get("dias")
        if not isinstance(dias, int) or dias <= 0:
            raise ValueError("dias deve ser um inteiro positivo quando modo='dias'")
    if modo == "livre":
        if not periodo_cfg.get("data_inicio"):
            raise ValueError("data_inicio é obrigatório quando modo='livre'")
        _parse_iso_date(periodo_cfg["data_inicio"])  # levanta erro se inválida
        if periodo_cfg.get("data_fim"):
            _parse_iso_date(periodo_cfg["data_fim"])


def validate_ruptura_config(cfg):
    validate_periodo(cfg["vendas_periodo"])
    validate_periodo(cfg["entrada_periodo"])
    validate_periodo(cfg["pedido_periodo"])
    if not cfg.get("situacao_entrada"):
        raise ValueError("situacao_entrada não pode ser vazio")
    if not cfg.get("operacao_entrada"):
        raise ValueError("operacao_entrada não pode ser vazio")
    if cfg.get("permitecompra") not in ("A", "I"):
        raise ValueError("permitecompra deve ser 'A' ou 'I'")
    if cfg.get("permitevenda") not in ("A", "I"):
        raise ValueError("permitevenda deve ser 'A' ou 'I'")
    if cfg.get("pro_status") not in ("A", "I"):
        raise ValueError("pro_status deve ser 'A' ou 'I'")

    situacoes = cfg.get("situacoes_pedido_pendente")
    if not isinstance(situacoes, list) or not situacoes:
        raise ValueError("situacoes_pedido_pendente precisa ter pelo menos 1 situação")
    if not set(situacoes) <= SITUACOES_PEDIDO_VALIDAS:
        raise ValueError(f"situacoes_pedido_pendente só aceita valores de {sorted(SITUACOES_PEDIDO_VALIDAS)}")

    if not isinstance(cfg.get("aglutinar_ligado_por_padrao"), bool):
        raise ValueError("aglutinar_ligado_por_padrao deve ser verdadeiro/falso")
    palavras = cfg.get("aglutinar_prefixo_palavras")
    if not isinstance(palavras, int) or not (1 <= palavras <= 6):
        raise ValueError("aglutinar_prefixo_palavras deve ser um inteiro entre 1 e 6")

    excecoes = cfg.get("aglutinar_prefixo_excecoes")
    if not isinstance(excecoes, list):
        raise ValueError("aglutinar_prefixo_excecoes precisa ser uma lista")
    for exc in excecoes:
        if not isinstance(exc, dict) or exc.get("nivel") not in ("departamento", "grupo", "subgrupo"):
            raise ValueError("cada exceção precisa de 'nivel' departamento/grupo/subgrupo")
        valores = exc.get("valores")
        if not isinstance(valores, list) or not valores or not all(valores):
            raise ValueError("cada exceção precisa de pelo menos 1 valor em 'valores' (múltipla escolha)")
        exc_palavras = exc.get("palavras")
        if not isinstance(exc_palavras, int) or not (1 <= exc_palavras <= 6):
            raise ValueError("'palavras' da exceção deve ser um inteiro entre 1 e 6")

    if cfg.get("tela_dias_padrao") not in DIAS_TELA_VALIDOS:
        raise ValueError(f"tela_dias_padrao deve ser um de {sorted(DIAS_TELA_VALIDOS)}")
    if not cfg.get("tela_filial_padrao"):
        raise ValueError("tela_filial_padrao não pode ser vazio")

    riscos = cfg.get("tela_riscos_padrao")
    if not isinstance(riscos, list) or not riscos:
        raise ValueError("tela_riscos_padrao precisa ter pelo menos 1 classificação")
    if not set(riscos) <= RISCOS_VALIDOS:
        raise ValueError(f"tela_riscos_padrao só aceita valores de {sorted(RISCOS_VALIDOS)}")

    truncar = cfg.get("grafico_truncar_rotulo")
    if not isinstance(truncar, int) or not (1 <= truncar <= 40):
        raise ValueError("grafico_truncar_rotulo deve ser um inteiro entre 1 e 40")

    if cfg.get("export_separador_csv") not in SEPARADORES_CSV_VALIDOS:
        raise ValueError(f"export_separador_csv deve ser um de {sorted(SEPARADORES_CSV_VALIDOS)}")

    colunas = cfg.get("export_colunas")
    if not isinstance(colunas, list) or not colunas:
        raise ValueError("export_colunas precisa ter pelo menos 1 coluna")
    if not set(colunas) <= COLUNAS_EXPORT_VALIDAS:
        raise ValueError(f"export_colunas só aceita valores de {sorted(COLUNAS_EXPORT_VALIDAS)}")


def validate_excesso_config(cfg):
    if not cfg.get("departamento_excluido"):
        raise ValueError("departamento_excluido não pode ser vazio")
    for campo in ("locais_kpi_custo", "locais_padrao"):
        locais = cfg.get(campo)
        if not isinstance(locais, list) or not locais:
            raise ValueError(f"{campo} precisa ter pelo menos 1 local")
        if not set(locais) <= LOCAIS_ESTOQUE_VALIDOS:
            raise ValueError(f"{campo} só aceita valores existentes em z_dw_006.localestoqueproduto")
    if cfg.get("dias_selecionado_padrao") not in DIAS_EXCESSO_VALIDOS:
        raise ValueError(f"dias_selecionado_padrao deve ser um de {sorted(DIAS_EXCESSO_VALIDOS)}")


def validate_indisponivel_config(cfg):
    categorias = cfg.get("locais_por_categoria")
    if not isinstance(categorias, dict):
        raise ValueError("locais_por_categoria precisa ser um objeto com uma lista por categoria")
    if set(categorias.keys()) != CATEGORIAS_INDISPONIVEL_VALIDAS:
        raise ValueError(f"locais_por_categoria precisa ter exatamente as categorias {sorted(CATEGORIAS_INDISPONIVEL_VALIDAS)}")
    for categoria, locais in categorias.items():
        if not isinstance(locais, list):
            raise ValueError(f"locais da categoria '{categoria}' precisa ser uma lista")
        if not set(locais) <= LOCAIS_ESTOQUE_VALIDOS:
            raise ValueError(f"locais da categoria '{categoria}' só aceita valores existentes em z_dw_006.localestoqueproduto")


def validate_visibilidade_config(cfg):
    ocultas = cfg.get("estoque_subtabs_ocultas")
    if not isinstance(ocultas, list):
        raise ValueError("estoque_subtabs_ocultas precisa ser uma lista")
    if not set(ocultas) <= ESTOQUE_SUBTABS_VALIDAS:
        raise ValueError(f"estoque_subtabs_ocultas só aceita valores de {sorted(ESTOQUE_SUBTABS_VALIDAS)}")
    if "ruptura" in ocultas:
        raise ValueError("A sub-aba Ruptura não pode ser ocultada")
