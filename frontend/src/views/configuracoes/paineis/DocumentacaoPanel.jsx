// Documentação de referência do Unillar BI, escrita pra qualquer gestor
// entender como cada ambiente funciona, sem precisar saber nada de código
// ou de banco de dados. Mantida atualizada à mão: toda vez que uma regra
// descrita aqui mudar de verdade num ajuste pedido ao Claude, o texto é
// revisado na mesma sessão da mudança. Não é um sistema que lê o código
// sozinho e se atualiza.

import { useState } from 'react';

const PAGINAS = [
  { key: 'projeto', label: 'Sobre o Projeto' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'configuracoes', label: 'Configurações' },
];

// Mesma ordem/rótulo de `SUBTABS` em views/estoque/Estoque.jsx — Ruptura,
// Indisponível e Excesso já têm regra de negócio real e documentação
// completa; os outros 5 ficam como estrutura pronta, esperando a análise
// ser definida. Ordem preservada de propósito (igual ao menu real do
// app) pra passar página em sequência fazer sentido.
const SUBAMBIENTES_ESTOQUE = [
  { key: 'geral', label: 'Geral' },
  { key: 'sem-giro', label: 'Sem Giro' },
  { key: 'ultimo-estoque', label: 'Último no Estoque' },
  { key: 'inativo-compra', label: 'Inativo p/ compra' },
  { key: 'margem', label: 'Margem' },
  { key: 'excesso', label: 'Excesso' },
  { key: 'indisponivel', label: 'Indisponível' },
  { key: 'ruptura', label: 'Ruptura' },
];

function Paginacao({ itens, ativo, onSelect }) {
  return (
    <div className="subtabs config-subtabs">
      {itens.map(i => (
        <button
          key={i.key}
          className={'subtab' + (ativo === i.key ? ' active' : '')}
          onClick={() => onSelect(i.key)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

// Passador de página (setas + indicador de posição), pro submenu de
// Estoque — 8 rótulos não cabem bem numa fileira de abas horizontal (ficam
// espremidos/deformados); isso mostra 1 título grande por vez e navega em
// sequência, no mesmo espírito de folhear um documento.
function Paginador({ itens, indice, onIndice }) {
  const atual = itens[indice];
  return (
    <div className="doc-paginador">
      <button className="doc-pag-seta" onClick={() => onIndice(indice - 1)} disabled={indice === 0} aria-label="Página anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 6l-6 6 6 6" /></svg>
      </button>

      <div className="doc-pag-info">
        <div className="doc-pag-titulo">{atual.label}</div>
        <div className="doc-pag-dots">
          {itens.map((it, i) => (
            <button
              key={it.key}
              className={'doc-pag-dot' + (i === indice ? ' active' : '')}
              onClick={() => onIndice(i)}
              title={it.label}
              aria-label={it.label}
            />
          ))}
        </div>
        <div className="doc-pag-contador">{indice + 1} de {itens.length}</div>
      </div>

      <button className="doc-pag-seta" onClick={() => onIndice(indice + 1)} disabled={indice === itens.length - 1} aria-label="Próxima página">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div className="doc-bloco">
      {titulo && <div className="doc-bloco-titulo">{titulo}</div>}
      <div className="doc-bloco-corpo">{children}</div>
    </div>
  );
}

function Placeholder({ nome }) {
  return (
    <div className="empty-state doc-placeholder">
      <h3>{nome}: documentação pendente</h3>
      <p>Esse ambiente ainda não tem análise definida com o time. Assim que a regra de negócio for construída (como já foi feito pra Ruptura, Indisponível e Excesso), o resumo completo aparece aqui.</p>
    </div>
  );
}

const RISCOS = [
  { nivel: 'Emergência', cor: '#e5484d', quando: 'Não há estoque e não há nada a caminho, nem pedido nem entrada: risco imediato de ruptura na loja.' },
  { nivel: 'Urgência', cor: '#f5a524', quando: 'Já existe pedido de compra feito, mas o fornecedor está com a entrega atrasada há mais de 10 dias e nenhuma nota chegou ainda.' },
  { nivel: 'Alta', cor: '#f5d90a', quando: 'A mercadoria já faturou mas está atrasada há mais de 20 dias na transportadora, ou a quantidade comprada foi menor do que o necessário.' },
  { nivel: 'Média', cor: '#3987e5', quando: 'A equipe de compras já fez o pedido na quantidade certa e a entrega está dentro do prazo normal, é só aguardar.' },
  { nivel: 'Sem risco', cor: '#5c6470', quando: 'O estoque atual cobre a projeção de venda do período, ou o produto simplesmente não vendeu nada nesse período.' },
];

function TabelaRiscos() {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead><tr><th>Classificação</th><th>Quando aparece</th></tr></thead>
        <tbody>
          {RISCOS.map(r => (
            <tr key={r.nivel}>
              <td>
                <span className="doc-risk-nome">
                  <span className="doc-risk-dot" style={{ background: r.cor }} />
                  {r.nivel}
                </span>
              </td>
              <td>{r.quando}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginaProjeto() {
  return (
    <Bloco titulo="O que é o Unillar BI">
      <p>
        Painel de análises da empresa, no estilo Power BI, mas construído sob
        medida: não é um relatório embutido, é uma aplicação própria (site e
        servidor de cálculo) conectada direto no banco de dados de produção da
        Unillar. Todo número mostrado é real, atualizado a cada sincronização.
      </p>
      <p>
        Hoje o ambiente pronto pra apresentação é <b>Estoque → Ruptura</b>.
        Indisponível e Excesso já têm análise funcionando com dado real, mas
        estão temporariamente fora do menu de navegação enquanto a Ruptura é
        apresentada.
      </p>
    </Bloco>
  );
}

function PaginaRuptura() {
  return (
    <>
      <Bloco titulo="O que a tela responde">
        <p>
          Ruptura responde uma pergunta direta pro time de compras:
          <i> "quais produtos estão em risco de faltar na loja, e o quanto disso
          já está sendo resolvido?"</i> Ela cruza, produto por produto: quanto
          vendeu no período analisado, quanto tem de estoque disponível
          (rede inteira), quanto já está chegando (nota faturada, a caminho) e
          quanto ainda está pendente de compra (pedido feito, fornecedor não
          entregou).
        </p>
      </Bloco>

      <Bloco titulo="Os 3 indicadores no topo">
        <p>
          <b>Itens com risco de ruptura:</b> quantas linhas estão em algum
          nível de risco (todos menos "Sem risco"). <b>Pendente Entrada:</b>
          unidades já faturadas por fornecedores, só falta chegar fisicamente.
          <b> Pedido Pendente:</b> unidades solicitadas que o fornecedor ainda
          nem faturou. Os 3 respeitam os filtros aplicados e batem exatamente
          com a tabela abaixo, agrupada ou não.
        </p>
      </Bloco>

      <Bloco titulo="Como a classificação de risco funciona">
        <p>Cada produto cai automaticamente numa destas 5 faixas, da mais grave pra mais tranquila:</p>
        <TabelaRiscos />
        <p>
          Produto que <b>não vendeu nada</b> no período é sempre "Sem risco",
          mesmo com estoque zerado. Se ninguém está comprando, não há falta
          real acontecendo.
        </p>
      </Bloco>

      <Bloco titulo="Filtros disponíveis">
        <p>
          <b>Janela de dias</b> (7/30/60/90/12 meses), <b>Classificação de
          risco</b>, <b>Departamento</b>, <b>Grupo</b> e <b>Subgrupo</b>,
          todos combináveis entre si. A <b>Filial não tem seletor na tela</b>:
          a análise sempre roda pra rede inteira ("Todas as filiais"), de
          propósito, pra a decisão de compra considerar a empresa como um
          todo. É ajustável em Configurações se precisar travar numa loja.
        </p>
      </Bloco>

      <Bloco titulo="Aglutinação de produtos">
        <p>
          Quando ligada, junta numa única linha os produtos que são
          essencialmente o mesmo item em cores ou variações diferentes
          (reconhecidos pelas primeiras palavras da descrição), somando venda,
          estoque, entrada e pedido de todos os membros. Isso ajuda a ver se a
          falta de uma variação já está coberta por outra do mesmo produto.
          Clicar na linha abre o detalhe de cada membro. Só entra quem
          realmente vendeu no período; produto parado não aparece.
        </p>
      </Bloco>

      <Bloco titulo="Exportação e sincronização">
        <p>
          <b>Exportar Excel</b> gera um .csv com exatamente as linhas visíveis
          na tabela. <b>Sincronizar</b> refaz o cálculo pesado direto no banco
          de produção. Leva alguns minutos porque revarre milhões de
          registros, e a tela continua usável com o último dado enquanto isso.
        </p>
      </Bloco>
    </>
  );
}

function PaginaIndisponivel() {
  return (
    <Bloco titulo="O que a tela responde">
      <p>
        Mostra quanto dinheiro está parado em produtos que não estão
        disponíveis pra venda, separado em 4 categorias: <b>Assistência</b>,
        <b> Almoxarifado</b>, <b>Devolução</b> e <b>Empréstimo</b>. Cada
        categoria é definida por uma lista de locais de estoque, ajustável em
        Configurações sem precisar saber o nome exato do local de cabeça.
      </p>
      <p>
        Os 4 gráficos (Custo por filial/local/grupo/marca) são clicáveis e
        cruzam entre si, no mesmo padrão da Ruptura: clicar numa barra filtra
        os outros gráficos e a tabela ao mesmo tempo.
      </p>
    </Bloco>
  );
}

function PaginaExcesso() {
  return (
    <>
      <Bloco titulo="O que a tela responde">
        <p>
          Mostra produtos <b>comprados além do necessário</b>: estoque atual
          que sobra depois de descontar a venda projetada do período, e que
          também não recebeu nenhuma entrada nova nos últimos 90 dias (pra não
          penalizar reposição recente ou estoque de segurança saudável).
          Departamento definido como fora de análise (hoje, Almoxarifado) é
          sempre excluído.
        </p>
      </Bloco>
      <Bloco titulo="Os 3 indicadores no topo">
        <p>
          <b>Preço de custo</b> e <b>Preço de venda:</b> quanto esse excesso
          representa em R$, pelo custo de aquisição e pelo preço de venda.
          <b> Produtos em excesso:</b> soma de unidades paradas além do
          necessário.
        </p>
      </Bloco>
      <Bloco titulo="Filtros e gráficos">
        <p>
          Janela de dias própria (30 a 180) e 3 gráficos (Departamento, Grupo
          e Marca), clicáveis e cruzados entre si, mesmo princípio da
          Ruptura/Indisponível. A tabela também filtra por Departamento,
          Grupo e Marca direto no cabeçalho.
        </p>
      </Bloco>
    </>
  );
}

function PaginaConfiguracoes() {
  return (
    <>
      <Bloco titulo="Pra que serve esta tela">
        <p>
          Reúne os parâmetros que qualquer pessoa do time consegue trocar sem
          depender de mexer em código: situações de pedido/entrada que contam
          como pendente, quantas palavras usar pra reconhecer "mesmo produto"
          na Aglutinação, riscos marcados por padrão, colunas do Excel
          exportado, locais de cada categoria da Indisponível, e quais
          sub-abas de Estoque ficam visíveis no menu.
        </p>
        <p>
          A navegação lateral abre recolhida: escolha um ambiente pra ver a
          lista de módulos dele. Módulo com selo "Pendente" ainda não tem
          parâmetro configurável, mas já reserva o espaço.
        </p>
      </Bloco>
      <Bloco titulo="O que fica travado, de propósito">
        <p>
          A <b>fórmula</b> de classificação de risco em si (limites de dias
          pra virar Urgência/Alta) fica no código, decisão consciente pra
          nunca divergir do relatório original do Power BI. Mudar isso exige
          pedir um ajuste direto, não é campo de tela.
        </p>
      </Bloco>
      <Bloco titulo="Sobre esta Documentação">
        <p>
          Este texto é atualizado à mão a cada ajuste relevante feito no
          projeto. Se algo aqui parecer desatualizado, avise que a gente
          corrige.
        </p>
      </Bloco>
    </>
  );
}

const CONTEUDO_ESTOQUE = {
  ruptura: PaginaRuptura,
  indisponivel: PaginaIndisponivel,
  excesso: PaginaExcesso,
};

const INDICE_INICIAL_ESTOQUE = SUBAMBIENTES_ESTOQUE.findIndex(s => s.key === 'ruptura');

function PaginaEstoque() {
  const [indice, setIndice] = useState(INDICE_INICIAL_ESTOQUE);
  const atual = SUBAMBIENTES_ESTOQUE[indice];
  const ConteudoSub = CONTEUDO_ESTOQUE[atual.key];

  function irPara(i) {
    setIndice(Math.max(0, Math.min(SUBAMBIENTES_ESTOQUE.length - 1, i)));
  }

  return (
    <>
      <Paginador itens={SUBAMBIENTES_ESTOQUE} indice={indice} onIndice={irPara} />
      {ConteudoSub ? <ConteudoSub /> : <Placeholder nome={atual.label} />}
    </>
  );
}

const CONTEUDO = {
  projeto: PaginaProjeto,
  vendas: () => <Placeholder nome="Vendas" />,
  estoque: PaginaEstoque,
  financeiro: () => <Placeholder nome="Financeiro" />,
  configuracoes: PaginaConfiguracoes,
};

export default function DocumentacaoPanel() {
  const [pagina, setPagina] = useState('projeto');
  const Conteudo = CONTEUDO[pagina];

  return (
    <div className="doc-panel">
      <Paginacao itens={PAGINAS} ativo={pagina} onSelect={setPagina} />
      <div className="doc-page"><Conteudo /></div>
    </div>
  );
}
