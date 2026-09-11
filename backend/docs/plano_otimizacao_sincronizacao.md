# Plano de otimização da sincronização (Ruptura/Indisponível/Excesso)

Combinado com o usuário em 09/09/2026: implementar depois que a
sincronização em andamento terminar (ele precisava dos dados pra uma
apresentação). Não implementar nada disto sem confirmar de novo antes
de começar, e validar cada etapa contra os números atuais conhecidos
(Ruptura: 902 produtos / 19087.84 pendente entrada / 233985.96 pedido
pendente) pra garantir que nenhum resultado mudou.

## 1. BUG DE DADO em Entradas pendentes — descoberto 09/09/2026, MAIS URGENTE que a performance

**Isto não é mais só lentidão — hoje a coluna/KPI "Entradas pendentes"
está vindo ZERADA pra todo mundo, e não é culpa da nossa configuração.**

Confirmado passo a passo em 09/09:
- A regra de negócio ORIGINAL (DAX do Power BI, documentada em
  `backend/docs/regras_ruptura.md`) exige `situacao = 'PENDENTE'` —
  **isso está certo no nosso código, `situacao_entrada = "PENDENTE"`
  não é bug de configuração nem foi alguém que mudou** (confirmado no
  histórico do git: esse valor já era esse desde o primeiro commit,
  26/08).
- A view do PRÓPRIO BANCO DO ERP `z_dw_026_itens` (não é nossa, não
  temos controle sobre ela) tem embutido um `WHERE e.ent_status = 'B'`
  (BAIXADO) fixo — ou seja, ela **nunca** expõe itens de notas com
  situação PENDENTE, só BAIXADO. Confirmado via `pg_views` direto no
  Postgres.
- Confirmei que existem sim 166 notas reais com situação PENDENTE no
  último ano (via `z_dw_026_capas`, que não tem essa restrição) — o
  dado existe no ERP, só não tem como puxar o detalhe por produto
  através dessa view específica.
- **Não existe correção nossa possível hoje**: nosso usuário do banco
  (`giro_dw`) só tem permissão nas VIEWS `z_dw_*`, não nas tabelas base
  (`tb_entradas`, `tb_entradas_itens` etc. — testei, deu
  `InsufficientPrivilege`). Não dá pra contornar a view reescrevendo
  direto nas tabelas (isso invalida a ideia original deste item 1,
  ver abaixo).
- **NÃO usar `situacao = 'BAIXADO'` como substituto** — errado no
  sentido de negócio: BAIXADO significa mercadoria já confirmada/
  recebida no estoque, o oposto de "pendente". Retornaria número
  não-zero, mas junto de um problema conceitual, o usuário pegou esse
  erro numa correção que eu tinha sugerido e cancelei antes de aplicar.
- Ontem (08/09) a mesma configuração (`PENDENTE`) trouxe resultado
  normal (R$19.087,84). A explicação mais provável é que **a view
  `z_dw_026_itens` foi alterada no servidor do banco do ERP entre
  ontem e hoje** (time/fornecedor do ERP, fora do nosso código) — não
  temos certeza 100%, mas é a explicação que bate com todas as
  evidências (nosso código/config não mudou nada relacionado a isso).

**Ação necessária: escalar pro time que administra o banco do ERP**
(fora do nosso alcance como app cliente). Perguntar se a view
`z_dw_026_itens` foi alterada recentemente, e se dá pra ela voltar a
expor itens de notas PENDENTE (ou pedir uma view/permissão nova que
exponha isso). **Sem isso resolvido do lado do banco, essa métrica
específica não tem como ficar correta**, não importa como a gente
reescreva a consulta do nosso lado.

**Enquanto isso não é resolvido:** mostrar "—" nesse campo em vez de
R$0,00 (que parece resultado real e não é) — ver `Ruptura.jsx`/KPI de
"venda perdida estimada" que já usa esse padrão de "não inventar
número" quando não dá pra calcular.

## 2. Otimizar a consulta de Entradas pendentes (performance, depois do item 1 resolvido)

Achado em 09/09/2026: mesmo com a situação certa, essa consulta é
pesada: o `WHERE e.ent_status = 'B'` embutido na view força o Postgres
a montar um hash join contra a tabela inteira `tb_entradas_itens`
(862 MB, ~950k linhas, crescendo) ANTES de aplicar o nosso filtro de
data — confirmado via `EXPLAIN` (custo estimado ~557.000, sequential
scan nas 2 tabelas grandes). Essa consulta foi, em todas as tentativas
de sincronização de 09/09, a única que ficou pendurada além dos 20min.

**Atenção, isso muda o plano original:** a ideia de reescrever direto
em `tb_entradas`/`tb_entradas_itens` (pulando a view) **não é viável**
— nosso usuário do banco (`giro_dw`) não tem permissão nas tabelas
base, só nas views `z_dw_*` (testado, deu `InsufficientPrivilege`).
Não tem como bypassar a view pelo nosso lado. Se o item 1 acima for
resolvido pelo time do ERP (view exposta corretamente), vale perguntar
pra eles também se dá pra otimizar essa view ou se existe uma
alternativa mais rápida de consultar a mesma informação sem escanear
a tabela inteira toda vez.

## 3. Parar de escanear z_dw_006 e z_dw_011 duas vezes cada

Hoje, dentro de `compute_base()`:
- `z_dw_006` é lida 2x: uma em `get_ativos()` (pra permitecompra/
  permitevenda), outra em `get_locais()` (catálogo de local de
  estoque).
- `z_dw_011` é lida 2x: uma dentro de `get_ativos()` (produtos sem
  registro em `z_dw_006`), outra em `get_produtos()` (cadastro
  completo).

**Ação:** ler cada view uma única vez e reaproveitar o resultado pras
2 finalidades — reduz o número de idas pesadas ao banco pela metade
nessas 2 views, sem mudar nenhuma lógica de filtro/negócio.

## 4. Atualização automática ao ligar o PC + painel de status

Ideia do usuário (09/09): ter algo "tipo Power Query" dentro de
Configurações — os dados pesados já ficam prontos localmente, sem o
usuário esperar na tela. Ponto importante já resolvido: **não é
questão de espaço** — o cache atual da Ruptura sozinho pesa 23MB no
disco (`.ruptura_cache.json`); com Indisponível e Excesso juntos, ainda
fica bem abaixo de 100MB. Não é necessário nem recomendado espelhar as
views inteiras num banco local — o que já existe (`compute_base()` +
`cache.py` salvando em JSON) já É esse "mirror", só falta automatizar
o horário.

**Decisão confirmada com o usuário (09/09): precisa funcionar sem
backend NEM frontend ligados** (ele quer poder desligar tudo e o
computador continuar rodando isso de madrugada sozinho). Por isso:

**Ação:**
- **Não** usar thread/agendador dentro do próprio processo do backend
  (isso exigiria o backend estar de pé no horário) nem bater no
  endpoint `/atualizar` via HTTP (mesmo motivo). Em vez disso, criar um
  **script Python standalone** (`backend/scripts/atualizar_noturno.py`
  ou nome parecido) que importa `ruptura_query`/`indisponivel_query`/
  `excesso_query`/`cache` direto (sem FastAPI, sem servidor de pé),
  roda `compute_base()` de cada aba e chama `cache.set_ready(...)` —
  isso já persiste no mesmo `.{nome}_cache.json` que o backend lê ao
  subir. Windows Task Scheduler dispara esse script sozinho, num
  horário fixo de baixo uso (ex: 5h da manhã), sem precisar de nada
  ligado além do computador em si e da rede até o Postgres do ERP.
- Quando o usuário religar o projeto depois (`iniciar.bat`), o backend
  já sobe lendo o cache fresco do disco (`Cache._load_from_disk()`),
  sem precisar rodar "Atualizar dados" de novo.
- Painel novo em Configurações mostrando, por aba: "Última atualização
  em DD/MM HH:MM" + botão "Atualizar agora" (reaproveita o endpoint que
  já existe, `/atualizar` de cada aba — não precisa endpoint novo).
- **Isso não torna a consulta mais rápida** — só tira a espera do
  caminho do usuário. O ganho de velocidade de fato vem dos itens 2 e
  3 acima. Combinar tudo dá o resultado completo: dado correto +
  consulta mais rápida + rodando sozinha ao ligar o PC.

## Ordem sugerida de implementação
1. **Item 1 (bug do dado) — prioridade máxima, é correção, não
   otimização.** Precisa de alguém do time do ERP/banco pra confirmar/
   corrigir a view `z_dw_026_itens`. Sem isso, os outros itens
   otimizam uma consulta que continua devolvendo dado errado.
2. Item 2 (performance da consulta de Entradas) — só depois do item 1
   resolvido pelo time do ERP, senão estaríamos otimizando algo que
   ainda vai precisar ser revisto de novo.
3. Item 3 (ler views 1x) — ganho menor, mas simples e de baixo risco,
   independente dos itens 1/2, pode ser feito em paralelo.
4. Item 4 (rodar ao ligar o PC + painel) — depois dos itens 1/2, pra já
   rodar rápido e com dado certo, não só automático.

## Lembrar de reverter depois do item 2 estar pronto
`backend/app/db.py` (`STATEMENT_TIMEOUT_MS`) e
`backend/app/watchdog.py` (`MAX_COMPUTING_SECONDS`) foram alargados de
20 para 45 minutos em 09/09/2026, como paliativo pra deixar a
sincronização daquele dia terminar. Depois que a consulta de Entradas
for otimizada (item 2), **voltar os dois pra 20 minutos** — o valor
original já tinha folga generosa sobre o tempo normal (~7min).
