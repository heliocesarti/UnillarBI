import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import VCarouselChart from '../../components/charts/VCarouselChart';
import FilterDropdown from '../../components/FilterDropdown';
import { api } from '../../api/client';
import { withSeriesColors } from '../../theme';
import { fmtFull, fmtInt } from '../../utils/format';
import { useCountUp } from '../../utils/useCountUp';
import { RANGES_EXCESSO } from '../../constants/filtros';

const CalendarIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;

const NUMERIC_COLS = new Set(['precoCm', 'totalCmExcesso', 'precoVenda', 'estoqueExcesso', 'estoqueFilial', 'vendasPeriodo']);

function sortValue(p, key) {
  if (NUMERIC_COLS.has(key)) return Number(p[key]) || 0;
  return (p[key] ?? '').toString().toLowerCase();
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

function FieldTag({ text }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{text}</span>;
}

function RupStat({ label, value, formatter }) {
  const text = useCountUp(value, formatter);
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <div className="kpi-value">{text}</div>
      </div>
    </div>
  );
}

function distinctSorted(lista, campo) {
  return Array.from(new Set(lista.map(p => p[campo]).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

const Excesso = forwardRef(function Excesso({ filial, onSyncStatusChange }, ref) {
  const [state, setState] = useState({ status: 'idle', data: null, updatedAt: null, error: null });
  const [fastLoading, setFastLoading] = useState(false);
  const [dias, setDias] = useState('60');
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedMarca, setSelectedMarca] = useState(null);
  const pollRef = useRef(null);
  const firstLoadDone = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async () => {
    const s = await api.getEstoqueExcesso(dias, filial);
    setState(s);
    if (s.status !== 'computing') stopPolling();
    return s;
  }, [dias, filial, stopPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (firstLoadDone.current) setFastLoading(true);
      const s = await fetchState();
      if (!cancelled) {
        setFastLoading(false);
        firstLoadDone.current = true;
        // Nunca teve cache calculado — dispara "Atualizar dados" sozinho
        // em vez de deixar a tela parada esperando o usuário clicar.
        if (s.status === 'idle') handleAtualizar();
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

  async function handleAtualizar() {
    setState(s => ({ ...s, status: 'computing' }));
    await api.atualizarEstoqueExcesso();
    fetchState();
  }

  useEffect(() => {
    onSyncStatusChange?.(state.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key: null, dir: 'desc' }
      : { key, dir: NUMERIC_COLS.has(key) ? 'desc' : 'asc' });
  }

  function handleLimparFiltros() {
    setSelectedDepartamento(null);
    setSelectedGrupo(null);
    setSelectedMarca(null);
  }

  // Expõe sincronizar/limpar filtros pro Topbar (só existem quando essa
  // aba está selecionada) — mesma função que o botão local chamava.
  useImperativeHandle(ref, () => ({ sincronizar: handleAtualizar, limparFiltros: handleLimparFiltros }));

  const AtualizarBtn = ({ label }) => (
    <button className="icon-btn" onClick={handleAtualizar} disabled={state.status === 'computing'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>
      {label}
    </button>
  );

  const kpis = state.data?.kpis ?? { custo: 0, venda: 0, produtosExcesso: 0 };
  const produtosBase = state.data?.produtos ?? [];
  const cardsDepartamentoBase = state.data?.cardsDepartamento ?? [];
  const cardsGrupoBase = state.data?.cardsGrupo ?? [];
  const cardsMarcaBase = state.data?.cardsMarca ?? [];

  // Cross-filtro entre os 3 gráficos + tabela, mesmo princípio das outras
  // abas: cada gráfico respeita a seleção dos OUTROS 2, mas ignora a
  // própria. Os cards vêm prontos (agregados) do backend sem recorte de
  // Departamento/Grupo/Marca — o cruzamento na tela é feito reagregando
  // a partir da tabela de produtos, que já carrega os 3 campos por linha.
  function agregarPorDimensao(lista, campo) {
    const somas = new Map();
    for (const p of lista) somas.set(p[campo], (somas.get(p[campo]) || 0) + p.totalCmExcesso);
    return Array.from(somas, ([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }

  const baseParaDepartamento = useMemo(() => produtosBase.filter(p =>
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca)
  ), [produtosBase, selectedGrupo, selectedMarca]);

  const baseParaGrupo = useMemo(() => produtosBase.filter(p =>
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedMarca || p.marca === selectedMarca)
  ), [produtosBase, selectedDepartamento, selectedMarca]);

  const baseParaMarca = useMemo(() => produtosBase.filter(p =>
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedGrupo || p.grupo === selectedGrupo)
  ), [produtosBase, selectedDepartamento, selectedGrupo]);

  // Só usa a agregação recalculada quando algum filtro está ativo (pra
  // permitir cruzamento); sem filtro nenhum, usa direto o agregado que já
  // veio pronto do backend (idêntico, mas evita reprocessar à toa).
  const semFiltroAlgum = !selectedDepartamento && !selectedGrupo && !selectedMarca;
  const cardsDepartamento = semFiltroAlgum ? cardsDepartamentoBase : agregarPorDimensao(baseParaDepartamento, 'departamento');
  const cardsGrupo = semFiltroAlgum ? cardsGrupoBase : agregarPorDimensao(baseParaGrupo, 'grupo');
  const cardsMarca = semFiltroAlgum ? cardsMarcaBase : agregarPorDimensao(baseParaMarca, 'marca');

  const departamentoOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...distinctSorted(baseParaDepartamento, 'departamento').map(v => ({ key: v, label: v })),
  ], [baseParaDepartamento]);

  const grupoOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...cardsGrupo.map(c => ({ key: c.label, label: c.label })),
  ], [cardsGrupo]);

  const marcaOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...distinctSorted(baseParaMarca, 'marca').map(v => ({ key: v, label: v })),
  ], [baseParaMarca]);

  const visibleProdutos = useMemo(() => produtosBase.filter(p =>
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca)
  ), [produtosBase, selectedDepartamento, selectedGrupo, selectedMarca]);

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

  // Exporta exatamente as linhas visíveis na tabela (mesmos filtros e
  // ordenação aplicados), mesmo padrão CSV/BOM da Ruptura/Indisponível.
  function handleExportarExcel() {
    const colDefs = [
      { header: 'Código', get: (p) => p.cod },
      { header: 'Descrição', get: (p) => p.desc },
      { header: 'Marca', get: (p) => p.marca },
      { header: 'Preço CM', get: (p) => fmtFull(p.precoCm) },
      { header: 'Total CM excesso', get: (p) => fmtFull(p.totalCmExcesso) },
      { header: 'Preço de venda', get: (p) => fmtFull(p.precoVenda) },
      { header: 'Estoque excesso', get: (p) => fmtInt(p.estoqueExcesso) },
      { header: 'Filial', get: (p) => p.filial },
      { header: 'Estoque filial', get: (p) => fmtInt(p.estoqueFilial) },
      { header: 'Local estoque', get: (p) => p.local },
      { header: 'Departamento', get: (p) => p.departamento },
      { header: 'Grupo', get: (p) => p.grupo },
      { header: 'Vendas período', get: (p) => fmtInt(p.vendasPeriodo) },
    ];
    const headers = colDefs.map((c) => c.header);
    const linhas = sortedProdutos.map((p) => colDefs.map((c) => c.get(p)));
    const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...linhas].map(row => row.map(escapar).join(';')).join('\r\n');
    const bom = String.fromCharCode(0xFEFF);
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excesso_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div className="view-fade" style={{ opacity: fastLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
      <div className="rup-filters">
        <div className="rup-filters-row">
          <FilterDropdown icon={CalendarIcon} options={RANGES_EXCESSO} selectedKey={dias} onSelect={setDias} footer="Janela de Vendas Período — vale só pra Excesso." />
        </div>
      </div>

      <div className="kpi-grid kpi-grid-3">
        <RupStat label="Preço de custo" value={kpis.custo} formatter={fmtFull} />
        <RupStat label="Preço de venda" value={kpis.venda} formatter={fmtFull} />
        <RupStat label="Produtos em excesso" value={kpis.produtosExcesso} formatter={fmtInt} />
      </div>

      <div className="ruptura-grid">
        <VCarouselChart
          title="Excesso por departamento"
          data={withSeriesColors(cardsDepartamento)}
          valueFormatter={fmtFull}
          selectedLabel={selectedDepartamento}
          onBarClick={(d) => setSelectedDepartamento(prev => prev === d.label ? null : d.label)}
        />
        <VCarouselChart
          title="Excesso por grupo"
          data={withSeriesColors(cardsGrupo)}
          valueFormatter={fmtFull}
          selectedLabel={selectedGrupo}
          onBarClick={(d) => setSelectedGrupo(prev => prev === d.label ? null : d.label)}
        />
        <VCarouselChart
          title="Excesso por marca"
          data={withSeriesColors(cardsMarca)}
          valueFormatter={fmtFull}
          selectedLabel={selectedMarca}
          onBarClick={(d) => setSelectedMarca(prev => prev === d.label ? null : d.label)}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title table-title">Produtos em excesso</div>
            <div className="card-subtitle">Mostrando {fmtInt(sortedProdutos.length)} itens</div>
          </div>
          <div className="card-actions">
            <button className="icon-btn" onClick={handleExportarExcel} title="Exporta a tabela (com os filtros e ordenação atuais) em .csv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              Exportar Excel
            </button>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Departamento" />} options={departamentoOptions} selectedKey={selectedDepartamento} onSelect={setSelectedDepartamento} /></div>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Grupo" />} options={grupoOptions} selectedKey={selectedGrupo} onSelect={setSelectedGrupo} /></div>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Marca" />} options={marcaOptions} selectedKey={selectedMarca} onSelect={setSelectedMarca} /></div>
          </div>
        </div>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="data-table visible">
            <thead>
              <tr>
                <Th col="cod" sort={sort} onSort={toggleSort}>Código</Th>
                <Th col="desc" sort={sort} onSort={toggleSort}>Descrição</Th>
                <Th col="marca" sort={sort} onSort={toggleSort}>Marca</Th>
                <Th col="precoCm" num sort={sort} onSort={toggleSort}>Preço CM</Th>
                <Th col="totalCmExcesso" num sort={sort} onSort={toggleSort}>Total CM excesso</Th>
                <Th col="precoVenda" num sort={sort} onSort={toggleSort}>Preço de venda</Th>
                <Th col="estoqueExcesso" num sort={sort} onSort={toggleSort}>Estoque excesso</Th>
                <Th col="filial" sort={sort} onSort={toggleSort}>Filial</Th>
                <Th col="estoqueFilial" num sort={sort} onSort={toggleSort}>Estoque filial</Th>
                <Th col="local" sort={sort} onSort={toggleSort}>Local estoque</Th>
                <Th col="departamento" sort={sort} onSort={toggleSort}>Departamento</Th>
                <Th col="grupo" sort={sort} onSort={toggleSort}>Grupo</Th>
                <Th col="vendasPeriodo" num sort={sort} onSort={toggleSort}>Vendas período</Th>
              </tr>
            </thead>
            <tbody>
              {sortedProdutos.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 22 }}>Nenhum produto em excesso encontrado.</td></tr>
              )}
              {sortedProdutos.map((p, i) => (
                <tr key={`${p.cod}-${p.filial}-${p.local}-${i}`}>
                  <td className="emph">{p.cod}</td>
                  <td className="desc" title={p.desc}>{p.desc}</td>
                  <td>{p.marca}</td>
                  <td className="num">{fmtFull(p.precoCm)}</td>
                  <td className="num">{fmtFull(p.totalCmExcesso)}</td>
                  <td className="num">{fmtFull(p.precoVenda)}</td>
                  <td className="num">{fmtInt(p.estoqueExcesso)}</td>
                  <td>{p.filial}</td>
                  <td className="num">{fmtInt(p.estoqueFilial)}</td>
                  <td>{p.local}</td>
                  <td>{p.departamento}</td>
                  <td>{p.grupo}</td>
                  <td className="num">{fmtInt(p.vendasPeriodo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default Excesso;
