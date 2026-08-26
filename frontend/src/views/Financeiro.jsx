import KpiCard from '../components/KpiCard';
import LoadingState from '../components/LoadingState';
import DivergingChart from '../components/charts/DivergingChart';
import DonutChart from '../components/charts/DonutChart';
import { api } from '../api/client';
import { useFetch } from '../utils/useFetch';
import { withSeriesColors } from '../theme';
import { fmtCurrency } from '../utils/format';

export default function Financeiro() {
  const { data, loading, error } = useFetch(api.getFinanceiro);
  if (loading || error) return <LoadingState error={error} />;

  const { kpis, fluxoCaixa, comprometimentoObrigacoes } = data;

  return (
    <div className="view-fade">
      <div className="kpi-grid">
        <KpiCard label="Faturamento do mês" value={kpis.faturamento.value} formatter={fmtCurrency} delta={kpis.faturamento.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.faturamento.spark} />
        <KpiCard label="Contas a receber" value={kpis.contasReceber.value} formatter={fmtCurrency} delta={kpis.contasReceber.delta} goodDirection={1} sub="vs. mês anterior" spark={kpis.contasReceber.spark} />
        <KpiCard label="Contas a pagar" value={kpis.contasPagar.value} formatter={fmtCurrency} delta={kpis.contasPagar.delta} goodDirection={-1} sub="vs. mês anterior" spark={kpis.contasPagar.spark} />
        <KpiCard label="Comprometimento financeiro" value={kpis.comprometimento.value} formatter={v => v.toFixed(1) + '%'} delta={kpis.comprometimento.delta} goodDirection={-1} sub="vs. mês anterior" spark={kpis.comprometimento.spark} />
      </div>
      <div className="chart-grid">
        <DivergingChart title="Fluxo de caixa mensal" subtitle="Entradas vs. saídas · últimos 6 meses" labels={fluxoCaixa.meses} pos={fluxoCaixa.entradas} neg={fluxoCaixa.saidas} />
        <DonutChart title="Comprometimento financeiro" subtitle="Distribuição das obrigações" data={withSeriesColors(comprometimentoObrigacoes)} centerFormatter={v => v.toFixed(0) + '%'} />
      </div>
    </div>
  );
}
