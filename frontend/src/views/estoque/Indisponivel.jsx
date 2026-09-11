import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import VCarouselChart from '../../components/charts/VCarouselChart';
import FilterDropdown from '../../components/FilterDropdown';
import { api } from '../../api/client';
import { withSeriesColors } from '../../theme';
import { fmtFull, fmtInt } from '../../utils/format';
import { useCountUp } from '../../utils/useCountUp';

const NUMERIC_COLS = new Set(['totalCm', 'quantidade']);

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

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Valores distintos (não vazios) de um campo, ordenados alfabeticamente —
// usado pra montar as opções dos filtros de Departamento/Grupo/Subgrupo.
function distinctSorted(lista, campo) {
  return Array.from(new Set(lista.map(p => p[campo]).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function FieldTag({ text }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{text}</span>;
}

// Agrupa e soma `totalCm` por um campo (filial/local/grupo/marca), sempre
// em ordem decrescente — mesmo princípio dos gráficos de Departamento/
// Grupo da Ruptura.
function agruparCusto(lista, campo) {
  const somas = new Map();
  for (const p of lista) somas.set(p[campo], (somas.get(p[campo]) || 0) + p.totalCm);
  return Array.from(somas, ([label, value]) => ({ label, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
}

function CategoriaCard({ label, quantidade, custo }) {
  const qtdText = useCountUp(quantidade, fmtInt);
  const custoText = useCountUp(custo, fmtFull);
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="indisp-kpi-row">
        <div className="indisp-kpi-metric">
          <span className="indisp-kpi-metric-label">Quantidade</span>
          <span className="indisp-kpi-metric-value">{qtdText}</span>
        </div>
        <div className="indisp-kpi-metric">
          <span className="indisp-kpi-metric-label">Valor de custo</span>
          <span className="indisp-kpi-metric-value">{custoText}</span>
        </div>
      </div>
    </div>
  );
}

const Indisponivel = forwardRef(function Indisponivel({ filial, onSyncStatusChange }, ref) {
  const [state, setState] = useState({ status: 'idle', data: null, updatedAt: null, error: null });
  const [fastLoading, setFastLoading] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedMarca, setSelectedMarca] = useState(null);
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  const [selectedSubgrupo, setSelectedSubgrupo] = useState(null);
  const pollRef = useRef(null);
  const firstLoadDone = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchState = useCallback(async () => {
    const s = await api.getEstoqueIndisponivel(filial);
    setState(s);
    if (s.status !== 'computing') stopPolling();
    return s;
  }, [filial, stopPolling]);

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
  }, [filial]);

  useEffect(() => {
    if (state.status === 'computing' && !pollRef.current) {
      pollRef.current = setInterval(fetchState, 5000);
    }
  }, [state.status, fetchState]);

  useEffect(() => stopPolling, [stopPolling]);

  async function handleAtualizar() {
    setState(s => ({ ...s, status: 'computing' }));
    await api.atualizarEstoqueIndisponivel();
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
    setSelectedFilial(null);
    setSelectedLocal(null);
    setSelectedGrupo(null);
    setSelectedMarca(null);
    setSelectedDepartamento(null);
    setSelectedSubgrupo(null);
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

  const produtos = state.data?.produtos ?? [];
  const kpis = state.data?.kpis ?? [];

  // Cross-filtro entre os 4 gráficos + tabela, mesmo princípio da Ruptura:
  // cada gráfico respeita a seleção dos OUTROS 3, mas ignora a própria —
  // senão, ao selecionar uma barra, sobraria só ela pra clicar de novo e
  // não teria como comparar/trocar de seleção.
  const baseParaFilial = useMemo(() => produtos.filter(p =>
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedLocal, selectedGrupo, selectedMarca, selectedDepartamento, selectedSubgrupo]);

  const baseParaLocal = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedFilial, selectedGrupo, selectedMarca, selectedDepartamento, selectedSubgrupo]);

  const baseParaGrupo = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedFilial, selectedLocal, selectedMarca, selectedDepartamento, selectedSubgrupo]);

  const baseParaMarca = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedFilial, selectedLocal, selectedGrupo, selectedDepartamento, selectedSubgrupo]);

  // Sem gráfico próprio (só dropdown) — a lista de opções respeita os
  // outros filtros ativos, mesmo princípio dos "baseParaX" acima.
  const baseParaDepartamento = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedFilial, selectedLocal, selectedGrupo, selectedMarca, selectedSubgrupo]);

  const baseParaSubgrupo = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento)
  ), [produtos, selectedFilial, selectedLocal, selectedGrupo, selectedMarca, selectedDepartamento]);

  const custoPorFilial = useMemo(() => agruparCusto(baseParaFilial, 'filial'), [baseParaFilial]);
  const custoPorLocal = useMemo(() => agruparCusto(baseParaLocal, 'local'), [baseParaLocal]);
  const custoPorGrupo = useMemo(() => agruparCusto(baseParaGrupo, 'grupo'), [baseParaGrupo]);
  const custoPorMarca = useMemo(() => agruparCusto(baseParaMarca, 'marca'), [baseParaMarca]);

  // Opções dos 3 filtros novos (flags do Power BI): "Todos" + valores
  // distintos existentes no recorte atual dos outros filtros.
  const departamentoOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...distinctSorted(baseParaDepartamento, 'departamento').map(v => ({ key: v, label: v })),
  ], [baseParaDepartamento]);

  const grupoOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...custoPorGrupo.map(c => ({ key: c.label, label: c.label })),
  ], [custoPorGrupo]);

  const subgrupoOptions = useMemo(() => [
    { key: null, label: 'Todos' },
    ...distinctSorted(baseParaSubgrupo, 'subgrupo').map(v => ({ key: v, label: v })),
  ], [baseParaSubgrupo]);

  // Tabela: respeita os 6 filtros ao mesmo tempo.
  const visibleProdutos = useMemo(() => produtos.filter(p =>
    (!selectedFilial || p.filial === selectedFilial) &&
    (!selectedLocal || p.local === selectedLocal) &&
    (!selectedGrupo || p.grupo === selectedGrupo) &&
    (!selectedMarca || p.marca === selectedMarca) &&
    (!selectedDepartamento || p.departamento === selectedDepartamento) &&
    (!selectedSubgrupo || p.subgrupo === selectedSubgrupo)
  ), [produtos, selectedFilial, selectedLocal, selectedGrupo, selectedMarca, selectedDepartamento, selectedSubgrupo]);

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

  const custoVisivel = useMemo(() => round2(visibleProdutos.reduce((a, p) => a + p.totalCm, 0)), [visibleProdutos]);

  // Exporta exatamente as linhas visíveis na tabela (mesmos filtros e
  // ordenação aplicados), mesmo padrão CSV/BOM da Ruptura — aqui as
  // colunas são fixas (as 10 da tabela), sem tela de Configurações própria.
  function handleExportarExcel() {
    const colDefs = [
      { header: 'Código', get: (p) => p.cod },
      { header: 'Descrição', get: (p) => p.desc },
      { header: 'Marca', get: (p) => p.marca },
      { header: 'Total CM', get: (p) => fmtFull(p.totalCm) },
      { header: 'Quantidade', get: (p) => fmtInt(p.quantidade) },
      { header: 'Filial', get: (p) => p.filial },
      { header: 'Local estoque', get: (p) => p.local },
      { header: 'Departamento', get: (p) => p.departamento },
      { header: 'Grupo', get: (p) => p.grupo },
      { header: 'Subgrupo', get: (p) => p.subgrupo },
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
    a.download = `indisponivel_${new Date().toISOString().slice(0, 10)}.csv`;
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
      <div className="kpi-grid">
        {kpis.map(k => (
          <CategoriaCard key={k.key} label={k.label} quantidade={k.quantidade} custo={k.custo} />
        ))}
      </div>

      <div className="chart-grid even">
        <VCarouselChart
          title="Custo por filial"
          data={withSeriesColors(custoPorFilial.map(c => ({ ...c, raw: c.label, label: `Filial ${c.label}` })))}
          valueFormatter={fmtFull}
          compress
          selectedLabel={selectedFilial ? `Filial ${selectedFilial}` : null}
          onBarClick={(d) => setSelectedFilial(prev => prev === d.raw ? null : d.raw)}
        />
        <VCarouselChart
          title="Custo por local"
          data={withSeriesColors(custoPorLocal)}
          valueFormatter={fmtFull}
          compress
          selectedLabel={selectedLocal}
          onBarClick={(d) => setSelectedLocal(prev => prev === d.label ? null : d.label)}
        />
      </div>
      <div className="chart-grid even">
        <VCarouselChart
          title="Custo por grupo"
          data={withSeriesColors(custoPorGrupo)}
          valueFormatter={fmtFull}
          compress
          selectedLabel={selectedGrupo}
          onBarClick={(d) => setSelectedGrupo(prev => prev === d.label ? null : d.label)}
        />
        <VCarouselChart
          title="Custo por marca"
          data={withSeriesColors(custoPorMarca)}
          valueFormatter={fmtFull}
          compress
          selectedLabel={selectedMarca}
          onBarClick={(d) => setSelectedMarca(prev => prev === d.label ? null : d.label)}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title table-title">Produtos indisponíveis</div>
            <div className="card-subtitle">Mostrando {fmtInt(sortedProdutos.length)} itens · custo total {fmtFull(custoVisivel)}</div>
          </div>
          <div className="card-actions">
            <button className="icon-btn" onClick={handleExportarExcel} title="Exporta a tabela (com os filtros e ordenação atuais) em .csv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              Exportar Excel
            </button>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Departamento" />} options={departamentoOptions} selectedKey={selectedDepartamento} onSelect={setSelectedDepartamento} /></div>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Grupo" />} options={grupoOptions} selectedKey={selectedGrupo} onSelect={setSelectedGrupo} /></div>
            <div className="indisp-filter"><FilterDropdown icon={<FieldTag text="Subgrupo" />} options={subgrupoOptions} selectedKey={selectedSubgrupo} onSelect={setSelectedSubgrupo} /></div>
          </div>
        </div>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="data-table visible">
            <thead>
              <tr>
                <Th col="cod" sort={sort} onSort={toggleSort}>Código</Th>
                <Th col="desc" sort={sort} onSort={toggleSort}>Descrição</Th>
                <Th col="marca" sort={sort} onSort={toggleSort}>Marca</Th>
                <Th col="totalCm" num sort={sort} onSort={toggleSort}>Total CM</Th>
                <Th col="quantidade" num sort={sort} onSort={toggleSort}>Quantidade</Th>
                <Th col="filial" sort={sort} onSort={toggleSort}>Filial</Th>
                <Th col="local" sort={sort} onSort={toggleSort}>Local estoque</Th>
                <Th col="departamento" sort={sort} onSort={toggleSort}>Departamento</Th>
                <Th col="grupo" sort={sort} onSort={toggleSort}>Grupo</Th>
                <Th col="subgrupo" sort={sort} onSort={toggleSort}>Subgrupo</Th>
              </tr>
            </thead>
            <tbody>
              {sortedProdutos.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 22 }}>Nenhum produto indisponível encontrado.</td></tr>
              )}
              {sortedProdutos.map((p, i) => (
                <tr key={`${p.cod}-${p.filial}-${p.local}-${i}`}>
                  <td className="emph">{p.cod}</td>
                  <td className="desc" title={p.desc}>{p.desc}</td>
                  <td>{p.marca}</td>
                  <td className="num">{fmtFull(p.totalCm)}</td>
                  <td className="num">{fmtInt(p.quantidade)}</td>
                  <td>{p.filial}</td>
                  <td>{p.local}</td>
                  <td>{p.departamento}</td>
                  <td>{p.grupo}</td>
                  <td>{p.subgrupo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default Indisponivel;
