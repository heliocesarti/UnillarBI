# Dados de demonstração. Serão substituídos por consultas ao PostgreSQL
# quando a conexão for habilitada em produção.

MONTHS = ["Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"]
FATURAMENTO = [3920000, 4050000, 4180000, 4620000, 5340000, 3880000, 3950000, 4100000, 4220000, 4350000, 4580000, 4820000]

KPI_VISAO_GERAL = {
    "faturamento": {"value": 4820000, "delta": 8.4, "spark": FATURAMENTO},
    "pedidos": {"value": 6340, "delta": 3.1, "spark": [5620, 5710, 5830, 5960, 6510, 5480, 5590, 5720, 5860, 5990, 6150, 6340]},
    "ticketMedio": {"value": 760, "delta": 2.3, "spark": [698, 705, 712, 720, 735, 708, 715, 722, 730, 742, 751, 760]},
    "comprometimento": {"value": 42, "delta": -1.8, "spark": [47, 46.5, 46, 45.2, 44.8, 44.5, 44, 43.6, 43.2, 42.8, 42.4, 42]},
}

KPI_VENDAS = {
    "vendasTotais": {"value": 4820000, "delta": 8.4, "spark": FATURAMENTO},
    "numeroPedidos": {"value": 6340, "delta": 3.1, "spark": [5620, 5710, 5830, 5960, 6510, 5480, 5590, 5720, 5860, 5990, 6150, 6340]},
    "ticketMedio": {"value": 760, "delta": 2.3, "spark": [698, 705, 712, 720, 735, 708, 715, 722, 730, 742, 751, 760]},
    "taxaConversao": {"value": 3.8, "delta": 0.4, "spark": [3.2, 3.3, 3.3, 3.4, 3.6, 3.3, 3.4, 3.5, 3.6, 3.6, 3.7, 3.8]},
}

KPI_ESTOQUE_GERAL = {
    "skusAtivos": {"value": 12480, "delta": 1.6, "spark": [11920, 11980, 12040, 12100, 12180, 12220, 12260, 12310, 12360, 12400, 12440, 12480]},
    "itensRuptura": {"value": 86, "delta": -12.2, "spark": [128, 122, 118, 112, 108, 104, 99, 95, 92, 90, 88, 86]},
    "giroEstoque": {"value": 4.2, "delta": 7.7, "spark": [3.6, 3.65, 3.7, 3.75, 3.8, 3.85, 3.9, 3.95, 4.0, 4.05, 4.1, 4.2]},
    "ocupacaoCd": {"value": 78, "delta": 4.1, "spark": [68, 69, 70, 71, 72, 73, 74, 75, 75, 76, 77, 78]},
}

KPI_FINANCEIRO = {
    "faturamento": {"value": 4820000, "delta": 8.4, "spark": FATURAMENTO},
    "contasReceber": {"value": 1960000, "delta": 5.2, "spark": [1680000, 1720000, 1750000, 1790000, 1830000, 1860000, 1880000, 1900000, 1920000, 1940000, 1950000, 1960000]},
    "contasPagar": {"value": 1420000, "delta": 3.9, "spark": [1260000, 1280000, 1300000, 1320000, 1340000, 1350000, 1360000, 1370000, 1385000, 1400000, 1410000, 1420000]},
    "comprometimento": {"value": 42, "delta": -1.8, "spark": [47, 46.5, 46, 45.2, 44.8, 44.5, 44, 43.6, 43.2, 42.8, 42.4, 42]},
}

CATEGORIAS = [
    {"label": "Material de Construção", "value": 1650000},
    {"label": "Ferragens", "value": 920000},
    {"label": "Elétrica", "value": 810000},
    {"label": "Hidráulica", "value": 680000},
    {"label": "Tintas & Acabamento", "value": 510000},
    {"label": "Ferramentas", "value": 250000},
]

FILIAIS = [
    {"label": "Centro", "value": 1420000},
    {"label": "Norte Shopping", "value": 1150000},
    {"label": "Zona Sul", "value": 980000},
    {"label": "Bairro Industrial", "value": 740000},
    {"label": "Outlet", "value": 530000},
]

HEAT_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
HEAT_PERIODS = ["Manhã", "Tarde", "Noite"]
HEAT_MATRIX = [
    [180, 240, 140], [175, 235, 138], [190, 250, 145], [200, 260, 150],
    [230, 310, 190], [260, 340, 210], [90, 150, 80],
]

ESTOQUE_CAT = [
    {"label": "Material de Construção", "value": 4200},
    {"label": "Ferragens", "value": 2600},
    {"label": "Elétrica", "value": 2100},
    {"label": "Hidráulica", "value": 1750},
    {"label": "Tintas & Acabamento", "value": 1200},
    {"label": "Ferramentas", "value": 630},
]

FLUXO_MESES = ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul"]
FLUXO_ENTRADAS = [3950000, 4100000, 4220000, 4350000, 4580000, 4820000]
FLUXO_SAIDAS = [-3420000, -3510000, -3680000, -3790000, -3950000, -4180000]

COMPROMETIMENTO = [
    {"label": "Fornecedores", "value": 38},
    {"label": "Impostos", "value": 22},
    {"label": "Folha de Pagamento", "value": 26},
    {"label": "Aluguel", "value": 9},
    {"label": "Outros", "value": 5},
]

# Os dados de Ruptura agora vêm de verdade do banco giro_homo — ver
# app/ruptura_query.py e app/cache.py.
