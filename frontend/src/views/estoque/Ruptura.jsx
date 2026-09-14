import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import VCarouselChart from '../../components/charts/VCarouselChart';
import DonutChart from '../../components/charts/DonutChart';
import FilterDropdown from '../../components/FilterDropdown';
import { api } from '../../api/client';
import { theme, withSeriesColors } from '../../theme';
import { fmtNum } from '../../utils/format';
import { useCountUp } from '../../utils/useCountUp';
import { useMobileLayout } from '../../utils/useMobileLayout';
import { RANGES } from '../../constants/filtros';

const CalendarIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;

const DIAS_MAP = { '7': 7, '30': 30, '60': 60, '90': 90, '12m': 365 };

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Ordem fixa pedida: sempre as 6 opções, mesmo sem produto naquele status.
const RISCO_ORDEM = [
  {
    key: 'ruptura', label: 'Ruptura', color: theme.riskRuptura,
    info: 'Estoque ZERADO agora! Mesmo com pedido ou entrada a caminho, o produto já está sem nenhuma unidade disponível — nível mais crítico, pede atenção imediata. (Válido apenas para produtos ativos para sugestão de compra).',
  },
  {
    key: 'emergencia', label: 'Emergência', color: theme.riskEmergencia,
    info: 'Vai faltar muito em breve! Estoque baixo, nenhum pedido de reposição foi feito até agora e não há mercadoria a caminho. (Válido apenas para produtos ativos para o sugestão de compra).',
  },
  {
    key: 'urgencia', label: 'Urgência', color: theme.riskUrgencia,
    info: 'Estoque baixo! Já foi feito o pedido, mas o fornecedor está atrasado há mais de 10 dias e ainda não faturou a nota. (Válido apenas para produtos ativos para o sugestão de compra).',
  },
  {
    key: 'alta', label: 'Alta', color: theme.riskAlta,
    info: 'Estoque baixo! A mercadoria faturou mas está atrasada há mais de 20 dias na transportadora, ou foi comprada uma quantidade menor do que a gente precisava. (Válido apenas para produtos ativos para o sugestão de compra).',
  },
  {
    key: 'media', label: 'Média', color: theme.riskMedia,
    info: 'Estoque baixo! mas a equipe de compras já fez o pedido na quantidade certa e a entrega está dentro do prazo normal. É só aguardar. (Válido apenas para produtos ativos para sugestão de compra).',
  },
  {
    key: 'sem-risco', label: 'Sem risco', color: theme.riskNone,
    info: 'Estoque saudável e sob controle! Tem mercadoria suficiente para cobrir as vendas e não há nenhuma projeção de falta do produto. (Válido apenas para produtos ativos para sugestão de compra).',
  },
];
const RISCO_MAP = Object.fromEntries(RISCO_ORDEM.map(r => [r.key, r]));
const RISCO_SEVERIDADE = Object.fromEntries(RISCO_ORDEM.map((r, i) => [r.key, RISCO_ORDEM.length - i]));

// Colunas numéricas ordenam maior->menor no 1º clique (estilo Power BI);
// texto ordena A->Z no 1º clique. "Ruptura" usa a severidade do risco
// (Emergência primeiro), não ordem alfabética do rótulo.
const NUMERIC_COLS = new Set(['vendas', 'estoque', 'entrada', 'pedidos', 'diasPedidosPend', 'diasPendEntrada', 'projecao', 'risco']);

function sortValue(p, key) {
  if (key === 'risco') return RISCO_SEVERIDADE[p.risco] ?? 0;
  if (NUMERIC_COLS.has(key)) return Number(p[key]) || 0;
  return (p[key] ?? '').toString().toLowerCase();
}

function InfoTip({ text }) {
  return (
    <span className="info-tip" onClick={(e) => e.preventDefault()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></svg>
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}

function Th({ col, num, className, sort, onSort, children }) {
  const active = sort.key === col;
  return (
    <th className={'sortable' + (num ? ' num' : '') + (active ? ' sorted' : '') + (className ? ' ' + className : '')} onClick={() => onSort(col)}>
      <span className="th-stack">
        {children}
        <span className="sort-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </span>
    </th>
  );
}

function RupStat({ label, value, formatter, sub }) {
  const text = useCountUp(value, formatter);
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <div className="kpi-value">{text}</div>
      </div>
      {sub && (
        <div className="kpi-foot">
          <span className="kpi-sub">{sub}</span>
        </div>
      )}
    </div>
  );
}

// Dropdown de múltipla escolha (Departamento/Grupo/Subgrupo) — mesmo
// padrão visual/markup do dropdown de Classificação de risco acima
// (details/summary), só que as opções vêm do catálogo real em vez de
// serem fixas, e o resumo no botão mostra quantas estão marcadas.
function MultiCheckDropdown({ label, options, selected, onToggle }) {
  const resumo = selected.size === 0 ? label : `${label} (${selected.size})`;
  return (
    <div className="rup-minimal-field">
      <details className="rup-minimal-dropdown">
        <summary className="rup-minimal-input" style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resumo}
          </span>
          <svg className="date-filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="rup-dropdown-menu scrollable">
          {options.length === 0 && <div className="rup-dropdown-item" style={{ cursor: 'default' }}>Nenhuma opção</div>}
          {options.map(v => (
            <label key={v} className="rup-dropdown-item" title={v}>
              <input type="checkbox" checked={selected.has(v)} onChange={() => onToggle(v)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

const Ruptura = forwardRef(function Ruptura({ onSyncStatusChange }, ref) {
  // Filtro de dias é local da Ruptura (não fica mais no Topbar global) —
  // só ela usa janela de tempo pra vendas; outras abas de Estoque não têm
  // essa dimensão, então mudar aqui não deve afetar mais nada.
  const [dateRange, setDateRange] = useState('60');
  const dias = DIAS_MAP[dateRange] ?? 60;
  const { portrait, isMobile } = useMobileLayout();
  // Em pé (linha bem mais estreita, 5 filtros precisam caber): rótulo bem
  // curto, "60 dias" sem prefixo. Deitado (mais espaço) mantém "Últ. 60
  // dias". Desktop continua com o texto completo de sempre.
  const rangesDisplay = portrait
    ? RANGES.map(r => ({ ...r, label: r.label.replace('Últimos ', '') }))
    : isMobile
      ? RANGES.map(r => ({ ...r, label: r.label.replace('Últimos', 'Últ.') }))
      : RANGES;

  const [state, setState] = useState({ status: 'idle', data: null, updatedAt: null, error: null });
  const [fastLoading, setFastLoading] = useState(false);
  // Vazio = sem filtro (mostra tudo) — mesmo padrão de selectedDepartamentos/
  // selectedGrupos/selectedSubgrupos: clicar ISOLA (só quem foi selecionado
  // fica visível), não exclui. Antes começava cheio e clicar tirava da
  // lista, fazendo o segmento clicado sumir e os outros ficarem — invertido
  // do que o usuário esperava (clicar deveria isolar, não excluir).
  const [activeRiscos, setActiveRiscos] = useState(() => new Set());
  // Múltipla escolha (Set) — um operador pode atender mais de um
  // departamento/grupo/subgrupo ao mesmo tempo. Set vazio = sem filtro
  // (mostra tudo), igual ao antigo `null`.
  const [selectedDepartamentos, setSelectedDepartamentos] = useState(() => new Set());
  const [selectedGrupos, setSelectedGrupos] = useState(() => new Set());
  const [selectedSubgrupos, setSelectedSubgrupos] = useState(() => new Set());
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [selectedProdutos, setSelectedProdutos] = useState(() => new Set());
  const [aglutinarOn, setAglutinarOn] = useState(false);
  const [aglutinarModal, setAglutinarModal] = useState(null);
  const [rupturaCfg, setRupturaCfg] = useState(null);
  const pollRef = useRef(null);
  const riscoDetailsRef = useRef(null);
  const firstLoadDone = useRef(false);
  const cfgAplicadoRef = useRef(false);

  // Filial não tem seletor na tela (pedido do time de compras — a análise
  // sempre roda pra rede inteira, sem opção de recorte por loja aqui,
  // diferente de Indisponível que ainda usa o dropdown do Topbar). Fica
  // travado no valor de Configurações > Estoque > Ruptura > Padrões da
  // tela, que agora é o único jeito de mudar isso (sem UI aqui). "todas"
  // é o valor padrão até a config carregar.
  const filialFixa = rupturaCfg?.tela_filial_padrao || 'todas';

  // Preferências de tela definidas em Configurações > Estoque > Ruptura
  // (riscos marcados por padrão, Aglutinar ligado por padrão, truncamento
  // de rótulo, separador/colunas do export). Aplicadas uma única vez, no
  // primeiro carregamento — depois disso o usuário controla pela própria tela.
  useEffect(() => {
    api.getConfig().then(all => setRupturaCfg(all.ruptura)).catch(() => {});
  }, []);

  useEffect(() => {
    if (rupturaCfg && !cfgAplicadoRef.current) {
      cfgAplicadoRef.current = true;
      // Config padrão traz os 5 riscos marcados (herdado do modelo antigo,
      // onde a lista cheia = "sem filtro"). No modelo atual (vazio = sem
      // filtro, selecionado = isolado) uma lista com TODOS os riscos precisa
      // virar Set vazio, senão o primeiro clique já parte de um set cheio e
      // volta a se comportar como exclusão em vez de isolamento. Só aplica
      // como isolamento de verdade quando for um subconjunto escolhido de
      // propósito em Configurações.
      if (rupturaCfg.tela_riscos_padrao?.length) {
        const riscosPadrao = new Set(rupturaCfg.tela_riscos_padrao);
        setActiveRiscos(riscosPadrao.size >= RISCO_ORDEM.length ? new Set() : riscosPadrao);
      }
      setAglutinarOn(!!rupturaCfg.aglutinar_ligado_por_padrao);
      if (rupturaCfg.tela_dias_padrao) setDateRange(rupturaCfg.tela_dias_padrao);
    }
  }, [rupturaCfg]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async () => {
    const s = await api.getEstoqueRuptura(dias, filialFixa);
    setState(s);
    if (s.status !== 'computing') stopPolling();
    return s;
  }, [dias, filialFixa, stopPolling]);

  // Roda no primeiro carregamento e sempre que dias/filialFixa mudam (a
  // 2ª só muda quando a config termina de carregar, se for diferente de
  // "todas"). Depois do primeiro carregamento, isso é rápido (poucos
  // segundos) — não precisa do botão "Atualizar dados" de novo, só a lista
  // de produtos ativos passa por ele.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (firstLoadDone.current) setFastLoading(true);
      const s = await fetchState();
      if (!cancelled) {
        setFastLoading(false);
        firstLoadDone.current = true;
        // Nunca teve cache calculado (1ª vez que a tela é aberta, ou o
        // arquivo de cache não existe) — dispara "Atualizar dados" sozinho
        // em vez de deixar a tela parada esperando o usuário clicar.
        if (s.status === 'idle') handleAtualizar();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, filialFixa]);

  useEffect(() => {
    if (state.status === 'computing' && !pollRef.current) {
      pollRef.current = setInterval(fetchState, 5000);
    }
  }, [state.status, fetchState]);

  useEffect(() => stopPolling, [stopPolling]);

  // Esc fecha o dropdown de Classificação de risco, igual fechar clicando fora.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && riscoDetailsRef.current?.open) {
        riscoDetailsRef.current.open = false;
      }
      if (e.key === 'Escape') setAglutinarModal(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleAtualizar() {
    setState(s => ({ ...s, status: 'computing' }));
    await api.atualizarEstoqueRuptura();
    fetchState();
  }

  useEffect(() => {
    onSyncStatusChange?.(state.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  function toggleRisco(key) {
    setActiveRiscos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Só 2 estados por coluna: clicar ordena (maior->menor se numérica,
  // A->Z se texto); clicar de novo na mesma coluna volta pra ordem
  // original — sem alternar pra outras ordenações a cada clique.
  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key: null, dir: 'desc' }
      : { key, dir: NUMERIC_COLS.has(key) ? 'desc' : 'asc' });
  }

  function handleLimparFiltros() {
    setActiveRiscos(new Set());
    setSelectedDepartamentos(new Set());
    setSelectedGrupos(new Set());
    setSelectedSubgrupos(new Set());
    setSort({ key: null, dir: 'desc' });
    setSelectedProdutos(new Set());
  }

  function toggleEmSet(setState, value) {
    setState(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }

  // Expõe sincronizar/limpar filtros pro Topbar (só existem quando essa
  // aba está selecionada) — mesma função que os botões locais já chamavam.
  useImperativeHandle(ref, () => ({ sincronizar: handleAtualizar, limparFiltros: handleLimparFiltros }));

  // Clique normal isola só esse produto (clicar de novo no único selecionado
  // volta a mostrar todos); Ctrl/Cmd+clique acumula mais de um na isolação.
  function handleProdutoClick(cod, e) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedProdutos(prev => {
        const next = new Set(prev);
        if (next.has(cod)) next.delete(cod); else next.add(cod);
        return next;
      });
    } else {
      setSelectedProdutos(prev => (prev.size === 1 && prev.has(cod)) ? new Set() : new Set([cod]));
    }
  }

  const AtualizarBtn = ({ label }) => (
    <button className="icon-btn" onClick={handleAtualizar} disabled={state.status === 'computing'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>
      {label}
    </button>
  );

  // Todo derivado precisa ser hook incondicional (chamado sempre, mesmo
  // nos estados idle/computing/error abaixo) — por isso fica antes dos
  // returns antecipados, com fallback pra state.data == null.
  const produtos = state.data?.produtos ?? [];
  const produtosAglutinados = state.data?.produtosAglutinados ?? [];
  // Só a TABELA troca de fonte conforme o toggle "Aglutinar" — KPIs e os
  // gráficos de Departamento/Grupo/Status continuam sempre baseados nos
  // produtos individuais (`produtos`), não mudam com o agrupamento.
  const produtosTabelaFonte = aglutinarOn ? produtosAglutinados : produtos;

  // Base dos KPIs e do donut de Status: agora usa `produtosTabelaFonte` (a
  // MESMA fonte da tabela) — antes usava sempre `produtos` individual,
  // então com Aglutinar ligado o KPI "Itens com risco de ruptura" contava
  // cada SKU separado enquanto a tabela já mostrava a família como 1 linha
  // só, e os números nunca batiam. Respeita departamento/grupo/subgrupo,
  // mas NÃO o pill de risco (senão o donut fica degenerado ao filtrar por
  // um risco só).
  const baseFiltrada = useMemo(() => produtosTabelaFonte.filter(p =>
    (selectedDepartamentos.size === 0 || selectedDepartamentos.has(p.departamento)) &&
    (selectedGrupos.size === 0 || selectedGrupos.has(p.grupo)) &&
    (selectedSubgrupos.size === 0 || selectedSubgrupos.has(p.subgrupo))
  ), [produtosTabelaFonte, selectedDepartamentos, selectedGrupos, selectedSubgrupos]);

  // Opções dos 3 dropdowns fixos de Departamento/Grupo/Subgrupo — vêm do
  // catálogo completo (`produtos`, não filtrado), pra não sumir opção da
  // lista conforme outros filtros vão sendo aplicados (comportamento de
  // slicer fixo, diferente do cross-filtro dos gráficos de barra abaixo).
  const departamentoOptions = useMemo(() =>
    [...new Set(produtos.map(p => p.departamento))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  [produtos]);
  const grupoOptions = useMemo(() =>
    [...new Set(produtos.map(p => p.grupo))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  [produtos]);
  const subgrupoOptions = useMemo(() =>
    [...new Set(produtos.map(p => p.subgrupo))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  [produtos]);

  // Base pra tudo mais (tabela, KPIs, barras de Departamento/Grupo): soma
  // também o pill de risco — é o cross-filtro completo.
  const visibleProdutos = useMemo(() =>
    baseFiltrada.filter(p => activeRiscos.size === 0 || activeRiscos.has(p.risco)),
    [baseFiltrada, activeRiscos]);

  const emRiscoFiltrado = useMemo(() =>
    visibleProdutos.filter(p => p.risco !== 'sem-risco'),
    [visibleProdutos]);

  // "Itens com risco de ruptura" continua só contando quem tem risco de
  // verdade (emRiscoFiltrado). Já "Pendente Entrada"/"Pedido Pendente"
  // agora somam de `visibleProdutos` (todos os filtrados, Sem Risco
  // incluído) — pra bater com o total real da tabela de baixo, que nunca
  // excluiu Sem Risco da soma.
  const statsFiltrados = useMemo(() => ({
    produtosEmRuptura: emRiscoFiltrado.length,
    totalPendenteEntrada: round2(visibleProdutos.reduce((a, p) => a + p.entrada, 0)),
    totalPedidoPendente: round2(visibleProdutos.reduce((a, p) => a + p.pedidos, 0)),
  }), [emRiscoFiltrado, visibleProdutos]);

  // Base do gráfico de Departamento: respeita grupo/risco, mas NÃO o
  // próprio departamento selecionado — senão, ao clicar, o gráfico reduz a
  // 1 barra só e não sobra nada pra clicar de novo e resetar (mesmo motivo
  // do donut de Status não se auto-filtrar pelo pill de risco). Usa
  // `produtosTabelaFonte` (não `produtos`) pra contar do mesmo jeito que o
  // KPI "Itens com risco de ruptura" — com Aglutinar ligado, conta famílias
  // (1 linha por família), não cada SKU individual separado.
  const baseParaDepartamento = useMemo(() => produtosTabelaFonte.filter(p =>
    (selectedGrupos.size === 0 || selectedGrupos.has(p.grupo)) &&
    (selectedSubgrupos.size === 0 || selectedSubgrupos.has(p.subgrupo)) &&
    (activeRiscos.size === 0 || activeRiscos.has(p.risco)) && p.risco !== 'sem-risco'
  ), [produtosTabelaFonte, selectedGrupos, selectedSubgrupos, activeRiscos]);

  // Base do gráfico de Grupo: respeita departamento/risco, mas NÃO o
  // próprio grupo selecionado, pelo mesmo motivo acima. Mesma lógica de
  // `produtosTabelaFonte` que o gráfico de Departamento.
  const baseParaGrupo = useMemo(() => produtosTabelaFonte.filter(p =>
    (selectedDepartamentos.size === 0 || selectedDepartamentos.has(p.departamento)) &&
    (selectedSubgrupos.size === 0 || selectedSubgrupos.has(p.subgrupo)) &&
    (activeRiscos.size === 0 || activeRiscos.has(p.risco)) && p.risco !== 'sem-risco'
  ), [produtosTabelaFonte, selectedDepartamentos, selectedSubgrupos, activeRiscos]);

  // Contagem de SKUs em ruptura, não soma de unidades — um produto de
  // altíssimo giro (ex: tijolo, telha) não pode pesar mais que um produto
  // qualquer só porque vende em quantidade maior.
  const departamentoFiltrado = useMemo(() => {
    const counts = {};
    for (const p of baseParaDepartamento) counts[p.departamento] = (counts[p.departamento] || 0) + 1;
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [baseParaDepartamento]);

  const grupoFiltrado = useMemo(() => {
    const counts = {};
    for (const p of baseParaGrupo) counts[p.grupo] = (counts[p.grupo] || 0) + 1;
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [baseParaGrupo]);

  const statusFiltrado = useMemo(() => {
    const counts = {};
    for (const p of baseFiltrada) counts[p.risco] = (counts[p.risco] || 0) + 1;
    return RISCO_ORDEM.filter(r => r.key !== 'sem-risco' && counts[r.key] > 0).map(r => ({ key: r.key, label: r.label, value: counts[r.key] }));
  }, [baseFiltrada]);

  // Mesmo cruzamento de filtros de cima (Departamento/Grupo/Subgrupo/Risco),
  // só que a partir da fonte que muda com o toggle "Aglutinar" — é isso que
  // alimenta a tabela (linhas de família também têm departamento/grupo/
  // subgrupo/risco, então os mesmos filtros funcionam nelas igual num
  // produto normal).
  const baseFiltradaTabela = useMemo(() => produtosTabelaFonte.filter(p =>
    (selectedDepartamentos.size === 0 || selectedDepartamentos.has(p.departamento)) &&
    (selectedGrupos.size === 0 || selectedGrupos.has(p.grupo)) &&
    (selectedSubgrupos.size === 0 || selectedSubgrupos.has(p.subgrupo))
  ), [produtosTabelaFonte, selectedDepartamentos, selectedGrupos, selectedSubgrupos]);

  const visibleProdutosTabela = useMemo(() =>
    baseFiltradaTabela.filter(p => activeRiscos.size === 0 || activeRiscos.has(p.risco)),
    [baseFiltradaTabela, activeRiscos]);

  const tableTotals = useMemo(() => ({
    vendas: round2(visibleProdutosTabela.reduce((a, p) => a + p.vendas, 0)),
    estoque: round2(visibleProdutosTabela.reduce((a, p) => a + p.estoque, 0)),
    entrada: round2(visibleProdutosTabela.reduce((a, p) => a + p.entrada, 0)),
    pedidos: round2(visibleProdutosTabela.reduce((a, p) => a + p.pedidos, 0)),
  }), [visibleProdutosTabela]);

  const sortedProdutos = useMemo(() => {
    if (!sort.key) return visibleProdutosTabela;
    const dirMul = sort.dir === 'asc' ? 1 : -1;
    return [...visibleProdutosTabela].sort((a, b) => {
      const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
      if (va < vb) return -1 * dirMul;
      if (va > vb) return 1 * dirMul;
      return 0;
    });
  }, [visibleProdutosTabela, sort]);

  const rowsToShow = useMemo(() => {
    if (selectedProdutos.size === 0) return sortedProdutos;
    return sortedProdutos.filter(p => selectedProdutos.has(p.rowId));
  }, [sortedProdutos, selectedProdutos]);

  // Definição das colunas exportáveis, compartilhada entre a tabela
  // principal e o modal de família do Aglutinar (abaixo) — cada um usa só
  // o subconjunto de chaves que faz sentido pra sua própria tabela.
  function getExportColDefs() {
    return {
      cod: { header: 'Código', get: (p) => p.cod },
      desc: { header: 'Descrição', get: (p) => p.desc },
      marca: { header: 'Marca', get: (p) => p.marca },
      vendas: { header: `Total vendas ${dias}d`, get: (p) => Number(p.vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      estoque: { header: 'Estoque atual', get: (p) => fmtNum(p.estoque) },
      entrada: { header: 'Entradas pendentes', get: (p) => fmtNum(p.entrada) },
      pedidos: { header: 'Pedidos pendentes', get: (p) => fmtNum(p.pedidos) },
      diasPedidosPend: { header: 'Dias atraso pedido', get: (p) => p.diasPedidosPend },
      diasPendEntrada: { header: 'Dias atraso entrada', get: (p) => p.diasPendEntrada },
      projecao: { header: `Projeção ${dias}d`, get: (p) => fmtNum(p.projecao) },
      departamento: { header: 'Departamento', get: (p) => p.departamento },
      grupo: { header: 'Grupo', get: (p) => p.grupo },
      subgrupo: { header: 'Subgrupo', get: (p) => p.subgrupo },
      risco: { header: 'Ruptura', get: (p) => RISCO_MAP[p.risco]?.label ?? p.risco },
    };
  }

  function baixarCsv(colunas, colDefs, linhasFonte, nomeArquivo) {
    const separador = rupturaCfg?.export_separador_csv || ';';
    const headers = colunas.map((key) => colDefs[key].header);
    const linhas = linhasFonte.map((p) => colunas.map((key) => colDefs[key].get(p)));
    const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...linhas].map(row => row.map(escapar).join(separador)).join('\r\n');
    const bom = String.fromCharCode(0xFEFF);
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Exporta exatamente as linhas visíveis na tabela (mesmos filtros,
  // ordenação e isolação aplicados) pra um .csv que o Excel abre direto —
  // separador e colunas vêm de Configurações > Estoque > Ruptura >
  // Exportação (padrão: ';' e as 14 colunas, igual ao comportamento de
  // sempre) — BOM UTF-8 pra acentuação certa em qualquer separador.
  function handleExportarExcel() {
    const colDefs = getExportColDefs();
    const colunas = (rupturaCfg?.export_colunas?.length ? rupturaCfg.export_colunas : Object.keys(colDefs))
      .filter((key) => colDefs[key]);
    baixarCsv(colunas, colDefs, rowsToShow, `ruptura_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // Exporta os produtos da família aberta no modal do Aglutinar — mesmas
  // colunas que a própria tabela do modal mostra (sem Departamento/Grupo,
  // que a tabela de família não exibe).
  function handleExportarFamiliaExcel() {
    if (!aglutinarModal) return;
    const colDefs = getExportColDefs();
    const colunas = ['risco', 'cod', 'desc', 'marca', 'vendas', 'estoque', 'entrada', 'pedidos', 'diasPedidosPend', 'diasPendEntrada', 'projecao', 'subgrupo'];
    const nomeBase = (aglutinarModal.desc || 'familia').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    baixarCsv(colunas, colDefs, aglutinarModal.itens ?? [], `${nomeBase}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (state.status === 'idle') {
    return (
      <div className="view-fade">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          <h3>Nenhum dado carregado ainda</h3>
          <p>A consulta é pesada (pode levar alguns minutos) — clique para calcular a partir do banco de dados.</p>
          <div style={{ marginTop: 10 }}><AtualizarBtn label="Atualizar dados" /></div>
        </div>
      </div>
    );
  }

  if (state.status === 'computing' && !state.data) {
    return (
      <div className="view-fade">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
          <h3>Calculando...</h3>
          <p>Consultando o banco de dados. Isso pode levar vários minutos — a página atualiza sozinha quando terminar.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error' && !state.data) {
    return (
      <div className="view-fade">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          <h3>Erro ao calcular</h3>
          <p>{state.error}</p>
          <div style={{ marginTop: 10 }}><AtualizarBtn label="Tentar novamente" /></div>
        </div>
      </div>
    );
  }

  const { produtosAtivosTotal } = state.data;
  const updatedLabel = state.updatedAt
    ? new Date(state.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="view-fade" style={{ opacity: fastLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>

      {/* 1. Filtros Livres e Minimalistas (Design Limpo) */}
      <div className="rup-filters">
        <div className="rup-filters-row">

          <FilterDropdown icon={isMobile ? null : CalendarIcon} options={rangesDisplay} selectedKey={dateRange} onSelect={setDateRange} footer="Vale só pra Ruptura — outras abas não têm janela de tempo." />

          {/* Classificação de risco (Sanfona/Dropdown) */}
          <div className="rup-minimal-field">
            <details className="rup-minimal-dropdown" ref={riscoDetailsRef}>
              <summary className="rup-minimal-input" style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {portrait ? 'Risco' : isMobile ? 'Class. de risco' : 'Classificação de risco'}
                </span>
                <svg className="date-filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="rup-dropdown-menu">
                {RISCO_ORDEM.map(o => (
                  <label key={o.key} className="rup-dropdown-item">
                    <input type="checkbox" checked={activeRiscos.has(o.key)} onChange={() => toggleRisco(o.key)} />
                    <span className="fdot" style={{ background: o.color }} />
                    {o.label}
                    <InfoTip text={o.info} />
                  </label>
                ))}
              </div>
            </details>
          </div>

          {/* Em pé: abrevia TODOS os rótulos que ainda sobrarem (Depto/Subgr)
              pra caber os 5 filtros numa linha só, pedido do usuário.
              Deitado fica como já estava — nome completo, tem largura de
              sobra pros 3 gráficos + KPIs lado a lado. */}
          <MultiCheckDropdown label={portrait ? 'Depto' : 'Departamento'} options={departamentoOptions} selected={selectedDepartamentos} onToggle={(v) => toggleEmSet(setSelectedDepartamentos, v)} />
          <MultiCheckDropdown label="Grupo" options={grupoOptions} selected={selectedGrupos} onToggle={(v) => toggleEmSet(setSelectedGrupos, v)} />
          <MultiCheckDropdown label={portrait ? 'Subgr' : 'Subgrupo'} options={subgrupoOptions} selected={selectedSubgrupos} onToggle={(v) => toggleEmSet(setSelectedSubgrupos, v)} />

          {/* Sincronizar e Limpar filtros agora ficam só no Topbar (ao lado
              da Filial) — disparam a ação da aba de Estoque selecionada. */}
        </div>
      </div>

      {/* 2. KPIs Oficiais (Exatamente igual à aba Geral) */}
      <div className="kpi-grid kpi-grid-3">
        <RupStat label="Itens com risco de ruptura" value={statsFiltrados.produtosEmRuptura} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
        <RupStat label="Pendente Entrada" value={statsFiltrados.totalPendenteEntrada} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
        <RupStat label="Pedido Pendente" value={statsFiltrados.totalPedidoPendente} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
      </div>

      <div className="ruptura-grid">
        <VCarouselChart
          title="Departamento"
          data={withSeriesColors(departamentoFiltrado)} valueFormatter={fmtNum}
          selectedLabel={selectedDepartamentos}
          onBarClick={(d) => toggleEmSet(setSelectedDepartamentos, d.label)}
          truncateAt={rupturaCfg?.grafico_truncar_rotulo}
        />
        <VCarouselChart
          title="Grupo"
          data={withSeriesColors(grupoFiltrado)} valueFormatter={fmtNum}
          selectedLabel={selectedGrupos}
          onBarClick={(d) => toggleEmSet(setSelectedGrupos, d.label)}
          truncateAt={rupturaCfg?.grafico_truncar_rotulo}
        />
        <div className="rup-donut-col">
          <DonutChart
            title="Status da ruptura"
            data={statusFiltrado.map(s => ({ ...s, color: RISCO_MAP[s.key]?.color }))} centerFormatter={fmtNum}
            selectedKeys={activeRiscos}
            onSegmentClick={(s) => toggleRisco(s.key)}
            size={148} strokeWidth={16}
            compactLegend={isMobile}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title table-title">Produtos em ruptura</div>
            <div className="card-subtitle">Mostrando {fmtNum(rowsToShow.length)} produtos</div>
          </div>
          <div className="card-actions">
            <button className="icon-btn" onClick={handleExportarExcel} title="Exporta a tabela (com os filtros e ordenação atuais) em .csv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              Exportar Excel
            </button>
            <button
              className={'icon-btn' + (aglutinarOn ? ' aglutinar-on' : '')}
              onClick={() => setAglutinarOn(v => !v)}
              title="Agrupa produtos da mesma família (mesma descrição, marcas diferentes) numa única linha — clique na linha pra ver os produtos que compõem a família"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></svg>
              Aglutinar
            </button>
          </div>
        </div>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="data-table visible rup-table-compact">
            <thead>
              <tr>
                <Th col="risco" sort={sort} onSort={toggleSort}>Ruptura</Th>
                <Th col="cod" sort={sort} onSort={toggleSort}>Código</Th>
                <Th col="desc" sort={sort} onSort={toggleSort}>Descrição</Th>
                <Th col="marca" className="col-marca" sort={sort} onSort={toggleSort}>Marca</Th>
                <Th col="vendas" num sort={sort} onSort={toggleSort}>Total vendas<br />{dias}d</Th>
                <Th col="estoque" num sort={sort} onSort={toggleSort}>Estoque<br />atual</Th>
                <Th col="entrada" num sort={sort} onSort={toggleSort}>Entradas<br />pendentes</Th>
                <Th col="pedidos" num sort={sort} onSort={toggleSort}>Pedidos<br />pendentes</Th>
                <Th col="diasPedidosPend" num sort={sort} onSort={toggleSort}>Dias atraso<br />pedido</Th>
                <Th col="diasPendEntrada" num sort={sort} onSort={toggleSort}>Dias atraso<br />entrada</Th>
                <Th col="projecao" num sort={sort} onSort={toggleSort}>Projeção<br />{dias}d</Th>
                <Th col="departamento" sort={sort} onSort={toggleSort}>Departamento</Th>
                <Th col="grupo" sort={sort} onSort={toggleSort}>Grupo</Th>
                <Th col="subgrupo" sort={sort} onSort={toggleSort}>Subgrupo</Th>
              </tr>
            </thead>
            <tbody>
              {rowsToShow.length === 0 && (
                <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 22 }}>Nenhum produto para os filtros selecionados.</td></tr>
              )}
              {rowsToShow.map(p => (
                <tr
                  key={p.rowId}
                  className={(selectedProdutos.has(p.rowId) ? 'selected ' : '') + (p.isFamilia ? 'rup-aglutinar-familia-row' : '')}
                  title={p.isFamilia ? 'Clique pra ver todos os produtos que compõem a família' : undefined}
                  onClick={(e) => p.isFamilia ? setAglutinarModal(p) : handleProdutoClick(p.rowId, e)}
                  onDoubleClick={() => setSelectedProdutos(new Set())}
                >
                  <td>
                    <span className="risk-pill">
                      <span className="fdot" style={{ background: RISCO_MAP[p.risco]?.color }} />
                      <span>{RISCO_MAP[p.risco]?.label ?? p.risco}</span>
                    </span>
                  </td>
                  <td className="emph">
                    {p.isFamilia ? (
                      <span className="rup-aglutinar-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></svg>
                      </span>
                    ) : p.cod}
                  </td>
                  <td className="desc" title={p.desc}>{p.desc}</td>
                  <td className="col-marca">{p.isFamilia ? '' : p.marca}</td>
                  <td className="num">{Number(p.vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="num">{fmtNum(p.estoque)}</td>
                  <td className="num">{fmtNum(p.entrada)}</td>
                  <td className="num">{fmtNum(p.pedidos)}</td>
                  <td className="num">{p.diasPedidosPend}</td>
                  <td className="num">{p.diasPendEntrada}</td>
                  <td className="num">{fmtNum(p.projecao)}</td>
                  <td>{p.departamento}</td>
                  <td>{p.grupo}</td>
                  <td>{p.subgrupo}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td></td><td>Total</td><td></td><td></td>
                <td className="num">{tableTotals.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="num">{fmtNum(tableTotals.estoque)}</td>
                <td className="num">{fmtNum(tableTotals.entrada)}</td>
                <td className="num">{fmtNum(tableTotals.pedidos)}</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {aglutinarModal && (
        <div className="rup-modal-backdrop" onClick={() => setAglutinarModal(null)}>
          <div className="rup-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-title table-title">{aglutinarModal.desc}</div>
                <div className="card-subtitle">Produtos que compõem essa família</div>
              </div>
              <div className="card-actions">
                <button className="icon-btn" onClick={handleExportarFamiliaExcel} title="Exporta os produtos desta família em .csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                  Exportar Excel
                </button>
                <button className="icon-btn" onClick={() => setAglutinarModal(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  Fechar
                </button>
              </div>
            </div>
            <div className="table-scroll" style={{ overflowX: 'auto' }}>
              <table className="data-table visible rup-table-compact">
                <thead>
                  <tr>
                    <th><span className="th-stack">Ruptura</span></th>
                    <th><span className="th-stack">Código</span></th>
                    <th><span className="th-stack">Descrição</span></th>
                    <th className="col-marca"><span className="th-stack">Marca</span></th>
                    <th className="num"><span className="th-stack">Total vendas<br />{dias}d</span></th>
                    <th className="num"><span className="th-stack">Estoque<br />atual</span></th>
                    <th className="num"><span className="th-stack">Entradas<br />pendentes</span></th>
                    <th className="num"><span className="th-stack">Pedidos<br />pendentes</span></th>
                    <th className="num"><span className="th-stack">Dias atraso<br />pedido</span></th>
                    <th className="num"><span className="th-stack">Dias atraso<br />entrada</span></th>
                    <th className="num"><span className="th-stack">Projeção<br />{dias}d</span></th>
                    <th><span className="th-stack">Subgrupo</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(aglutinarModal.itens ?? []).map(it => (
                    <tr key={it.cod}>
                      <td>
                        <span className="risk-pill">
                          <span className="fdot" style={{ background: RISCO_MAP[it.risco]?.color }} />
                          <span>{RISCO_MAP[it.risco]?.label ?? it.risco}</span>
                        </span>
                      </td>
                      <td className="emph">{it.cod}</td>
                      <td className="desc" title={it.desc}>{it.desc}</td>
                      <td className="col-marca">{it.marca}</td>
                      <td className="num">{Number(it.vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="num">{fmtNum(it.estoque)}</td>
                      <td className="num">{fmtNum(it.entrada)}</td>
                      <td className="num">{fmtNum(it.pedidos)}</td>
                      <td className="num">{it.diasPedidosPend}</td>
                      <td className="num">{it.diasPendEntrada}</td>
                      <td className="num">{fmtNum(it.projecao)}</td>
                      <td>{it.subgrupo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Ruptura;
