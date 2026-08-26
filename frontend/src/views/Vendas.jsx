import KpiCard from '../components/KpiCard';
import LoadingState from '../components/LoadingState';
import BarChart from '../components/charts/BarChart';
import Heatmap from '../components/charts/Heatmap';
import { api } from '../api/client';
import { useFetch } from '../utils/useFetch';
import { withSeriesColors } from '../theme';
import { fmtCurrency } from '../utils/format';

export default function Vendas() {
  const { data, loading, error } = useFetch(api.getVendas);
  if (loading || error) return <LoadingState error={error} />;

  const { kpis, vendasPorFilial, heatmap } = data;

  return (
    <div className="view-fade">
      <div className="kpi-grid">
        <KpiCard label="Vendas totais" value={kpis.vendasTotais.value} formatter={fmtCurrency} delta={kpis.vendasTotais.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.vendasTotais.spark} />
        <KpiCard label="Número de pedidos" value={kpis.numeroPedidos.value} formatter={v => Math.round(v).toLocaleString('pt-BR')} delta={kpis.numeroPedidos.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.numeroPedidos.spark} />
        <KpiCard label="Ticket médio" value={kpis.ticketMedio.value} formatter={v => 'R$ ' + Math.round(v)} delta={kpis.ticketMedio.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.ticketMedio.spark} />
        <KpiCard label="Taxa de conversão" value={kpis.taxaConversao.value} formatter={v => v.toFixed(1) + '%'} delta={kpis.taxaConversao.delta} goodDirection={1} sub="pontos percentuais" spark={kpis.taxaConversao.spark} />
      </div>
      <div className="chart-grid even">
        <BarChart title="Vendas por filial" subtitle="Período selecionado · em R$" data={withSeriesColors(vendasPorFilial)} unitFormatter={fmtCurrency} />
        <Heatmap title="Pedidos por dia e período" subtitle="Volume médio semanal" days={heatmap.days} periods={heatmap.periods} matrix={heatmap.matrix} />
      </div>
    </div>
  );
}
