import KpiCard from '../components/KpiCard';
import LoadingState from '../components/LoadingState';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import { api } from '../api/client';
import { useFetch } from '../utils/useFetch';
import { withSeriesColors } from '../theme';
import { fmtCurrency } from '../utils/format';

export default function VisaoGeral() {
  const { data, loading, error } = useFetch(api.getVisaoGeral);
  if (loading || error) return <LoadingState error={error} />;

  const { kpis, faturamentoMensal, vendasPorCategoria } = data;

  return (
    <div className="view-fade">
      <div className="kpi-grid">
        <KpiCard label="Faturamento do mês" value={kpis.faturamento.value} formatter={fmtCurrency} delta={kpis.faturamento.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.faturamento.spark} />
        <KpiCard label="Pedidos" value={kpis.pedidos.value} formatter={v => Math.round(v).toLocaleString('pt-BR')} delta={kpis.pedidos.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.pedidos.spark} />
        <KpiCard label="Ticket médio" value={kpis.ticketMedio.value} formatter={v => 'R$ ' + Math.round(v)} delta={kpis.ticketMedio.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.ticketMedio.spark} />
        <KpiCard label="Comprometimento financeiro" value={kpis.comprometimento.value} formatter={v => v.toFixed(1) + '%'} delta={kpis.comprometimento.delta} goodDirection={-1} sub="vs. mês anterior" spark={kpis.comprometimento.spark} />
      </div>
      <div className="chart-grid">
        <LineChart title="Faturamento mensal" subtitle="Últimos 12 meses · em R$" labels={faturamentoMensal.labels} values={faturamentoMensal.values} seriesName="Faturamento" />
        <DonutChart title="Vendas por categoria" subtitle="Participação no faturamento" data={withSeriesColors(vendasPorCategoria)} />
      </div>
    </div>
  );
}
