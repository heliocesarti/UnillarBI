"""Mapa de todos os ambientes/módulos que a tela de Configurações pode
expor, com o status de cada um (`disponivel` = já tem parâmetros reais
editáveis; `pendente` = aparece na navegação, mas ainda sem parâmetros
definidos). Fonte única de verdade pro front montar o menu — adicionar um
módulo novo no futuro é só acrescentar uma entrada aqui e criar o painel
correspondente no frontend.
"""

AMBIENTES = [
    {
        "key": "visao-geral",
        "label": "Visão Geral",
        "modulos": [
            {"key": "geral", "label": "Parâmetros gerais", "status": "pendente"},
        ],
    },
    {
        "key": "vendas",
        "label": "Vendas",
        "modulos": [
            {"key": "geral", "label": "Parâmetros gerais", "status": "pendente"},
        ],
    },
    {
        "key": "estoque",
        "label": "Estoque",
        "modulos": [
            {"key": "geral", "label": "Geral", "status": "pendente"},
            {"key": "sem-giro", "label": "Sem Giro", "status": "pendente"},
            {"key": "ultimo-estoque", "label": "Último no Estoque", "status": "pendente"},
            {"key": "inativo-compra", "label": "Inativo p/ compra", "status": "pendente"},
            {"key": "margem", "label": "Margem", "status": "pendente"},
            {"key": "excesso", "label": "Excesso", "status": "pendente"},
            {"key": "indisponivel", "label": "Indisponível", "status": "disponivel"},
            {"key": "ruptura", "label": "Ruptura", "status": "disponivel"},
            {"key": "visibilidade", "label": "Visibilidade das sub-abas", "status": "disponivel"},
        ],
    },
    {
        "key": "financeiro",
        "label": "Financeiro",
        "modulos": [
            {"key": "geral", "label": "Parâmetros gerais", "status": "pendente"},
        ],
    },
    {
        "key": "documentacao",
        "label": "Documentação",
        "modulos": [
            # Resumo em português simples de como cada função do projeto
            # funciona hoje, pra explicar pro time sem precisar mexer em
            # código nem perguntar direto pro Claude toda vez. Mantido
            # atualizado manualmente (não lê o código sozinho) — toda vez
            # que uma regra de negócio já documentada aqui mudar de verdade,
            # o texto deve ser atualizado junto, na mesma sessão da mudança.
            {"key": "resumo", "label": "Como funciona", "status": "disponivel"},
        ],
    },
    {
        "key": "preferencias",
        "label": "Preferências",
        "modulos": [
            # Tema claro/escuro — preferência pessoal de quem está vendo a
            # tela, salva só no navegador (localStorage), não no servidor.
            {"key": "aparencia", "label": "Aparência", "status": "disponivel"},
            # Ambiente que abre ao carregar o sistema — mesma lógica de
            # preferência pessoal via localStorage, não no servidor.
            {"key": "tela_inicial", "label": "Tela inicial", "status": "disponivel"},
        ],
    },
]


def get_registry():
    return AMBIENTES
