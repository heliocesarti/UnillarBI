import { useEffect, useState } from 'react';
import KpiCard from '../../components/KpiCard';
import LoadingState from '../../components/LoadingState';
import BarChart from '../../components/charts/BarChart';
import { api } from '../../api/client';
import { useFetch } from '../../utils/useFetch';
import { withSeriesColors } from '../../theme';
import { fmtNum } from '../../utils/format';

export default function EstoqueGeral() {
  const { data, loading, error } = useFetch(api.getEstoqueGeral);
  const [fillWidth, setFillWidth] = useState('0%');

  useEffect(() => {
    if (!data) return;
    const raf = requestAnimationFrame(() => setFillWidth(data.ocupacaoCdPercent + '%'));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (loading || error) return <LoadingState error={error} />;

  const { kpis, estoquePorCategoria, ocupacaoCdPercent } = data;

  return (
    <div className="view-fade">
      <div className="kpi-grid">
        <KpiCard label="SKUs ativos" value={kpis.skusAtivos.value} formatter={v => Math.round(v).toLocaleString('pt-BR')} delta={kpis.skusAtivos.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.skusAtivos.spark} />
        <KpiCard label="Itens em ruptura" value={kpis.itensRuptura.value} formatter={v => Math.round(v).toLocaleString('pt-BR')} delta={kpis.itensRuptura.delta} goodDirection={-1} sub="vs. mês anterior" spark={kpis.itensRuptura.spark} />
        <KpiCard label="Giro de estoque" value={kpis.giroEstoque.value} formatter={v => v.toFixed(1) + 'x'} delta={kpis.giroEstoque.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.giroEstoque.spark} />
        <KpiCard label="Ocupação do CD" value={kpis.ocupacaoCd.value} formatter={v => v.toFixed(0) + '%'} delta={kpis.ocupacaoCd.delta} goodDirection={-1} sub="vs. mês anterior" spark={kpis.ocupacaoCd.spark} />
      </div>
      <div className="chart-grid even">
        <BarChart title="Estoque por categoria" subtitle="Unidades disponíveis no CD" data={withSeriesColors(estoquePorCategoria)} unitFormatter={v => fmtNum(v) + ' un.'} />
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Ocupação do centro de distribuição</div>
              <div className="card-subtitle">Capacidade utilizada vs. disponível</div>
            </div>
          </div>
          <div className="meter-block">
            <div className="meter-top"><span className="mv">{ocupacaoCdPercent}%</span><span className="ml">da capacidade total</span></div>
            <div className="meter-track"><div className="meter-fill" style={{ width: fillWidth }} /></div>
            <div className="meter-scale"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          <div className="legend" style={{ marginTop: 22 }}>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--series-1)' }} />Giro de estoque médio <span className="legend-val" style={{ marginLeft: 4 }}>{kpis.giroEstoque.value.toFixed(1)}x / mês</span></div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--status-critical)' }} />Itens em ruptura <span className="legend-val" style={{ marginLeft: 4 }}>{kpis.itensRuptura.value} SKUs</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
