import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VCarouselChart from '../../components/charts/VCarouselChart';
import DonutChart from '../../components/charts/DonutChart';
import CheckDropdown from '../../components/CheckDropdown';
import { api } from '../../api/client';
import { theme, withSeriesColors } from '../../theme';
import { fmtNum } from '../../utils/format';
import { useCountUp } from '../../utils/useCountUp';

const DIAS_MAP = { '7': 7, '30': 30, '60': 60, '90': 90, '12m': 365 };

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Ordem fixa pedida: sempre as 5 opções, mesmo sem produto naquele status.
const RISCO_ORDEM = [
  {
    key: 'emergencia', label: 'Emergência', color: theme.riskEmergencia,
    info: 'Produto sem estoque ou vai faltar muito em breve! Nenhum pedido de reposição foi feito até agora e não há mercadoria a caminho. (Válido apenas para produtos ativos para o sugestão de compra).',
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

const LocalIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;

function InfoTip({ text }) {
  return (
    <span className="info-tip" onClick={(e) => e.preventDefault()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></svg>
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}

function Th({ col, num, sort, onSort, children }) {
  const active = sort.key === col;
  return (
    <th className={'sortable' + (num ? ' num' : '') + (active ? ' sorted' : '')} onClick={() => onSort(col)}>
      {children}
      <span className="sort-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
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

export default function Ruptura({ dateRange, filial }) {
  const dias = DIAS_MAP[dateRange] ?? 60;

  const [state, setState] = useState({ status: 'idle', data: null, updatedAt: null, error: null });
  const [fastLoading, setFastLoading] = useState(false);
  const [activeRiscos, setActiveRiscos] = useState(() => new Set(RISCO_ORDEM.map(r => r.key)));
  const [activeLocais, setActiveLocais] = useState(new Set());
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [selectedProdutos, setSelectedProdutos] = useState(() => new Set());
  const pollRef = useRef(null);
  const riscoDetailsRef = useRef(null);
  const firstLoadDone = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async () => {
    const s = await api.getEstoqueRuptura(dias, filial);
    setState(s);
    if (s.status === 'ready' && s.data) {
      setActiveLocais(new Set(s.data.locaisEstoque));
    }
    if (s.status !== 'computing') stopPolling();
    return s;
  }, [dias, filial, stopPolling]);

  // Roda no primeiro carregamento e sempre que dias/filial mudam. Depois do
  // primeiro carregamento, isso é rápido (poucos segundos) — não precisa do
  // botão "Atualizar dados" de novo, só a lista de produtos ativos passa por ele.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (firstLoadDone.current) setFastLoading(true);
      await fetchState();
      if (!cancelled) {
        setFastLoading(false);
        firstLoadDone.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, filial]);

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
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleAtualizar() {
    setState(s => ({ ...s, status: 'computing' }));
    await api.atualizarEstoqueRuptura();
    fetchState();
  }

  function toggleRisco(key) {
    setActiveRiscos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleLocal(key) {
    setActiveLocais(prev => {
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
    setActiveRiscos(new Set(RISCO_ORDEM.map(r => r.key)));
    setActiveLocais(new Set(state.data?.locaisEstoque ?? []));
    setSelectedDepartamento(null);
    setSelectedGrupo(null);
    setSort({ key: null, dir: 'desc' });
    setSelectedProdutos(new Set());
  }

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

  // Base pro donut de Status: respeita local/departamento/grupo, mas NÃO
  // o pill de risco (senão o donut fica degenerado ao filtrar por um risco só).
  const baseFiltrada = useMemo(() => produtos.filter(p =>
    (p.locais.length === 0 || p.locais.some(l => activeLocais.has(l))) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedGrupo || p.grupo === selectedGrupo)
  ), [produtos, activeLocais, selectedDepartamento, selectedGrupo]);

  // Base pra tudo mais (tabela, KPIs, barras de Departamento/Grupo): soma
  // também o pill de risco — é o cross-filtro completo.
  const visibleProdutos = useMemo(() =>
    baseFiltrada.filter(p => activeRiscos.has(p.risco)),
    [baseFiltrada, activeRiscos]);

  const emRiscoFiltrado = useMemo(() =>
    visibleProdutos.filter(p => p.risco !== 'sem-risco'),
    [visibleProdutos]);

  const statsFiltrados = useMemo(() => ({
    produtosEmRuptura: emRiscoFiltrado.length,
    totalPendenteEntrada: round2(emRiscoFiltrado.reduce((a, p) => a + p.entrada, 0)),
    totalPedidoPendente: round2(emRiscoFiltrado.reduce((a, p) => a + p.pedidos, 0)),
  }), [emRiscoFiltrado]);

  // Base do gráfico de Departamento: respeita local/grupo/risco, mas NÃO o
  // próprio departamento selecionado — senão, ao clicar, o gráfico reduz a
  // 1 barra só e não sobra nada pra clicar de novo e resetar (mesmo motivo
  // do donut de Status não se auto-filtrar pelo pill de risco).
  const baseParaDepartamento = useMemo(() => produtos.filter(p =>
    (p.locais.length === 0 || p.locais.some(l => activeLocais.has(l))) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    activeRiscos.has(p.risco) && p.risco !== 'sem-risco'
  ), [produtos, activeLocais, selectedGrupo, activeRiscos]);

  // Base do gráfico de Grupo: respeita local/departamento/risco, mas NÃO o
  // próprio grupo selecionado, pelo mesmo motivo acima.
  const baseParaGrupo = useMemo(() => produtos.filter(p =>
    (p.locais.length === 0 || p.locais.some(l => activeLocais.has(l))) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    activeRiscos.has(p.risco) && p.risco !== 'sem-risco'
  ), [produtos, activeLocais, selectedDepartamento, activeRiscos]);

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

  const tableTotals = useMemo(() => ({
    vendas: round2(visibleProdutos.reduce((a, p) => a + p.vendas, 0)),
    estoque: round2(visibleProdutos.reduce((a, p) => a + p.estoque, 0)),
    entrada: round2(visibleProdutos.reduce((a, p) => a + p.entrada, 0)),
  }), [visibleProdutos]);

  const sortedProdutos = useMemo(() => {
    if (!sort.key) return visibleProdutos;
    const dirMul = sort.dir === 'asc' ? 1 : -1;
    return [...visibleProdutos].sort((a, b) => {
      const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
      if (va < vb) return -1 * dirMul;
      if (va > vb) return 1 * dirMul;
      return 0;
    });
  }, [visibleProdutos, sort]);

  const rowsToShow = useMemo(() => {
    if (selectedProdutos.size === 0) return sortedProdutos;
    return sortedProdutos.filter(p => selectedProdutos.has(p.cod));
  }, [sortedProdutos, selectedProdutos]);

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

  const { locaisEstoque, produtosAtivosTotal } = state.data;
  const updatedLabel = state.updatedAt
    ? new Date(state.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="view-fade" style={{ opacity: fastLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>

      {/* 1. Filtros Livres e Minimalistas (Design Limpo) */}
      <div className="rup-filters">
        <div className="rup-filters-row">
          
          {/* Classificação de risco (Sanfona/Dropdown) */}
          <div className="rup-minimal-field">
            <details className="rup-minimal-dropdown" ref={riscoDetailsRef}>
              <summary className="rup-minimal-input" style={{ cursor: 'pointer', padding: '0 12px' }}>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Classificação de risco
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
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

          {/* Limpar filtros + Sincronizar jogados elegantemente para a direita */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={handleLimparFiltros}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
              Limpar filtros
            </button>
            <AtualizarBtn label={state.status === 'computing' ? 'Sincronizando...' : 'Sincronizar'} />
          </div>

        </div>
      </div>

      {/* 2. KPIs Oficiais (Exatamente igual à aba Geral) */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <RupStat label="Itens em Ruptura" value={statsFiltrados.produtosEmRuptura} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
        <RupStat label="Pendente Entrada" value={statsFiltrados.totalPendenteEntrada} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
        <RupStat label="Pedido Pendente" value={statsFiltrados.totalPedidoPendente} formatter={v => Math.round(v).toLocaleString('pt-BR')} />
      </div>

      <div className="ruptura-grid">
        <VCarouselChart
          title="Departamento"
          data={withSeriesColors(departamentoFiltrado)} valueFormatter={fmtNum}
          selectedLabel={selectedDepartamento}
          onBarClick={(d) => setSelectedDepartamento(prev => prev === d.label ? null : d.label)}
        />
        <VCarouselChart
          title="Grupo"
          data={withSeriesColors(grupoFiltrado)} valueFormatter={fmtNum}
          selectedLabel={selectedGrupo}
          onBarClick={(d) => setSelectedGrupo(prev => prev === d.label ? null : d.label)}
        />
        <div className="rup-donut-col">
          <DonutChart
            title="Status da ruptura"
            data={statusFiltrado.map(s => ({ ...s, color: RISCO_MAP[s.key]?.color }))} centerFormatter={fmtNum}
            selectedKeys={activeRiscos}
            onSegmentClick={(s) => toggleRisco(s.key)}
            size={148} strokeWidth={16}
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
            <CheckDropdown icon={LocalIcon} label="Local de estoque" options={locaisEstoque} selected={activeLocais} onToggle={toggleLocal} />
          </div>
        </div>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="data-table visible">
            <thead>
              <tr>
                <Th col="cod" sort={sort} onSort={toggleSort}>Código</Th>
                <Th col="desc" sort={sort} onSort={toggleSort}>Descrição</Th>
                <Th col="marca" sort={sort} onSort={toggleSort}>Marca</Th>
                <Th col="vendas" num sort={sort} onSort={toggleSort}>Total vendas {dias}d</Th>
                <Th col="estoque" num sort={sort} onSort={toggleSort}>Estoque atual</Th>
                <Th col="entrada" num sort={sort} onSort={toggleSort}>Entradas pendentes</Th>
                <Th col="pedidos" num sort={sort} onSort={toggleSort}>Pedidos pendentes</Th>
                <Th col="diasPedidosPend" num sort={sort} onSort={toggleSort}>Dias atraso pedido</Th>
                <Th col="diasPendEntrada" num sort={sort} onSort={toggleSort}>Dias atraso entrada</Th>
                <Th col="projecao" num sort={sort} onSort={toggleSort}>Projeção {dias}d</Th>
                <Th col="departamento" sort={sort} onSort={toggleSort}>Departamento</Th>
                <Th col="grupo" sort={sort} onSort={toggleSort}>Grupo</Th>
                <Th col="subgrupo" sort={sort} onSort={toggleSort}>Subgrupo</Th>
                <Th col="risco" sort={sort} onSort={toggleSort}>Ruptura</Th>
              </tr>
            </thead>
            <tbody>
              {rowsToShow.length === 0 && (
                <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 22 }}>Nenhum produto para os filtros selecionados.</td></tr>
              )}
              {rowsToShow.map(p => (
                <tr
                  key={p.cod} className={selectedProdutos.has(p.cod) ? 'selected' : ''}
                  onClick={(e) => handleProdutoClick(p.cod, e)}
                  onDoubleClick={() => setSelectedProdutos(new Set())}
                >
                  <td className="emph">{p.cod}</td>
                  <td className="desc" title={p.desc}>{p.desc}</td>
                  <td>{p.marca}</td>
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
                  <td>
                    <span className="risk-pill">
                      <span className="fdot" style={{ background: RISCO_MAP[p.risco]?.color }} />
                      <span>{RISCO_MAP[p.risco]?.label ?? p.risco}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td><td></td><td></td>
                <td className="num">{tableTotals.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="num">{fmtNum(tableTotals.estoque)}</td>
                <td className="num">{fmtNum(tableTotals.entrada)}</td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
