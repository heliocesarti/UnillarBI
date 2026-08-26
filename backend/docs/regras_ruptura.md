# Regras de negócio — Ruptura (portadas do Power BI)

Este arquivo guarda o DAX original de cada medida usada na análise de
Ruptura, junto com a tradução do que ela realmente calcula em termos de
SQL/views do banco `giro_homo`. Vai sendo preenchido conforme o usuário
manda cada medida.

## Status_Ruptura → `Risco_Ruptura` (regra de classificação)

Usa 6 medidas auxiliares (listadas abaixo). Se `Projecao_60d <= 0` →
sempre "SEM RISCO". Senão, na ordem:

| Risco | Condição |
|---|---|
| EMERGÊNCIA | `Estoque < Vendas60d` E `Pedidos == 0` E `Entradas == 0` |
| URGÊNCIA | `Pedidos >= Projecao` E `DiasPedido > 5` E `Entradas == 0` |
| ALTA | `Pedidos >= Projecao` E `DiasPedido > 5` E `Entradas < Pedidos` |
| MÉDIA | `Pedidos >= Projecao` E `DiasPedido > 5` E `Entradas >= Pedidos` E `DiasEntrada > 30` |
| SEM RISCO | `Pedidos >= Projecao` E `DiasPedido > 5` E `Entradas >= Pedidos` E `DiasEntrada <= 30` |
| SEM RISCO (padrão) | qualquer outro caso |

`DiasPedido` (dias desde o pedido aberto mais antigo) **já está calculado**,
não depende de medida externa — e a medida solta `Dias_Pedidos_Pendentes` ✅
recebida confirma exatamente a mesma lógica:
- Junta `z_dw_029_itens` (`quantidade_itens > quantidade_entregue`) com
  `z_dw_029_capas` (`situacao IN ('PENDENTE','PARCIAL')`, `data_emissao >= hoje - 365`)
- Pega o `MIN(data_emissao)` desse conjunto → `v_DataMaisAntigaPedido`
- `DiasPedido = hoje - v_DataMaisAntigaPedido` (0 se não houver pedido aberto)

## Medidas auxiliares (uma por vez)

### `Total_Vendas_60d` ✅ recebida

DAX original: soma `quantidadeproduto` de `z_dw_002` onde
`emissao >= hoje - 60`, agrupado por `codigoproduto`. O resto do DAX
(passos "primeira descrição") é só truque visual do Power BI pra não
repetir o total em cada linha de grade/tamanho — **não se aplica no
nosso SQL**, porque vamos agregar direto por produto (uma linha por
produto, sem duplicar por grade).

**Tradução SQL:**
```sql
SELECT codigoproduto, SUM(quantidadeproduto) AS total_vendas_60d
FROM z_dw_002
WHERE emissao >= CURRENT_DATE - 60
GROUP BY codigoproduto;
```

### `Projecao_60d` ✅ recebida

Não é previsão de venda futura — é a "necessidade não coberta":
`MAX(0, Total_Vendas_60d - Estoque_Atual)`. Se o estoque atual já cobre
o que foi vendido nos últimos 60 dias, a projeção é 0 (e por isso, na
fórmula de `Risco_Ruptura`, isso já cai direto em "SEM RISCO").

**Tradução SQL:** (depende de `Estoque Atual`, ainda não recebida)
```sql
projecao_60d = GREATEST(total_vendas_60d - COALESCE(estoque_atual, 0), 0)
```

### `Estoque Atual` ✅ recebida (bateu com o palpite)

`SUM(z_dw_006.saldoestoqueproduto)`, agrupado por produto.

**Tradução SQL:**
```sql
SELECT codigoproduto, SUM(saldoestoqueproduto) AS estoque_atual
FROM z_dw_006
GROUP BY codigoproduto;
```

Todas as 6 medidas auxiliares da fórmula de `Risco_Ruptura` estão
confirmadas. Falta só juntar tudo numa query só por produto.

## Colunas da tabela "Produtos em ruptura" (do Power BI, print `colunas.png`)

Cod, Descrição, marcaproduto, Total vendas 60d, Estoque atual,
Total entrada pend, Saldo pend, Total pedidos pend, Dias pedidos pend,
Dias pend entrada, Projecao 60d, Ruptura Status.

Mapeamento: `Total entrada pend` = `Qtd_Total_Pendentes`,
`Saldo pend` = `Saldo_Pedidos_Menos_Entradas`,
`Total pedidos pend` = `Qtd_Pedidos_Pendentes`,
`Dias pedidos pend` = `Dias_Pedidos_Pendentes`,
`Dias pend entrada` = `Dias_Pendentes_Entrada`.

## Ainda faltando (KPIs do topo da tela, não são medida de produto)

- **Total produtos em Ruptura** — provavelmente `COUNT` de produtos na
  análise, mas não sei se é "todos os ativos" ou só "com algum risco
  (status <> SEM RISCO)". A confirmar.
- **Venda perdida estimada** — nenhuma fórmula recebida ainda. Não vou
  inventar esse cálculo.

### `Qtd_Total_Pendentes` (= "Entradas" na fórmula de risco) ✅ recebida

**Importante:** não é "o que já chegou" — é a quantidade que **já tem
nota fiscal de entrada emitida (mercadoria chegou fisicamente), mas a
nota ainda está com situação `PENDENTE`** (não foi confirmada/processada
como estoque disponível). É esse "travamento" que a regra MÉDIA usa
(`DiasEntrada > 30`): a nota existe cobrindo o pedido, mas está parada
há muito tempo sem confirmar.

DAX original: soma `quantidade` de `z_dw_026_itens` (itens de nota de
entrada), cruzando com `z_dw_026_capas` (cabeçalho da nota) onde:
- `situacao = 'PENDENTE'`
- `operacao_entrada = 'Entrada por COMPRA'`
- `data_emissao >= hoje - 365`
- filtrado pelo produto atual (`codigo_produto` = `z_dw_006.codigoproduto`)

**Tradução SQL:**
```sql
SELECT i.codigo_produto, SUM(i.quantidade) AS qtd_total_pendentes
FROM z_dw_026_itens i
JOIN z_dw_026_capas c ON c.chave_entrada = i.chave_entrada
WHERE c.situacao = 'PENDENTE'
  AND c.operacao_entrada = 'Entrada por COMPRA'
  AND c.data_emissao >= CURRENT_DATE - 365
GROUP BY i.codigo_produto;
```

### `Qtd_Pedidos_Pendentes` ✅ recebida (e bateu com meu palpite anterior)

DAX: soma de `quantidade_itens - quantidade_entregue` de `z_dw_029_itens`,
só linhas onde `quantidade_itens > quantidade_entregue`, e
`z_dw_029_capas.situacao IN ('PENDENTE','PARCIAL')`. Essa medida já inclui
direto o filtro de produto ativo (`permitecompra='A'`, `permitevenda='A'`
de `z_dw_006`) — resultado é `BLANK()` (não zero) se não houver saldo pendente.

**Tradução SQL:**
```sql
SELECT i.codigo_produto, SUM(i.quantidade_itens - i.quantidade_entregue) AS qtd_pedidos_pendentes
FROM z_dw_029_itens i
JOIN z_dw_029_capas c ON c.chave_pedido = i.chave_pedido  -- confirmar nome da coluna de produto em 029_itens
JOIN z_dw_006 p ON p.codigoproduto = i.codigo_produto      -- confirmar nome da coluna de produto em 029_itens
WHERE i.quantidade_itens > i.quantidade_entregue
  AND c.situacao IN ('PENDENTE', 'PARCIAL')
  AND p.permitecompra = 'A'
  AND p.permitevenda = 'A'
GROUP BY i.codigo_produto;
```

### `Dias_Pendentes_Entrada` ✅ recebida (bateu com o palpite)

Quantos dias atrás foi emitida a nota de entrada **pendente mais antiga**
(situação `PENDENTE`, `operacao_entrada = 'Entrada por COMPRA'`, últimos
365 dias) que contém aquele produto. `BLANK()` se não houver nenhuma.

**Tradução SQL:**
```sql
SELECT i.codigo_produto, MIN(c.data_emissao) AS data_mais_antiga_pendente
FROM z_dw_026_itens i
JOIN z_dw_026_capas c ON c.chave_entrada = i.chave_entrada
WHERE c.situacao = 'PENDENTE'
  AND c.operacao_entrada = 'Entrada por COMPRA'
  AND c.data_emissao >= CURRENT_DATE - 365
GROUP BY i.codigo_produto;
-- dias_pendentes_entrada = CURRENT_DATE - data_mais_antiga_pendente (por produto)
```

## Filtro global (vale pra toda a análise de Ruptura)

Revelado pela medida `Saldo_Pedidos_Menos_Entradas` (Qtd_Pedidos_Pendentes
− Qtd_Total_Pendentes, some produto por produto, escondida quando dá 0):
**só considerar produtos ativos** —
```sql
z_dw_006.permitecompra = 'A' AND z_dw_006.permitevenda = 'A'
```
Isso precisa entrar como filtro em toda query da tela de Ruptura, não só
nessa medida específica.
