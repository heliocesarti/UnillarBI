import Sparkline from './Sparkline';
import { useCountUp } from '../utils/useCountUp';

export default function KpiCard({ label, value, formatter, delta, goodDirection, sub, spark, deltaSuffix = '%' }) {
  const text = useCountUp(value, formatter);
  const good = (delta >= 0) === (goodDirection > 0);

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <div className="kpi-value">{text}</div>
        <div className={'kpi-delta ' + (good ? 'good' : 'bad')}>
          {delta >= 0 ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          )}
          <span>{Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{deltaSuffix}</span>
        </div>
      </div>
      <div className="kpi-foot">
        <div className="kpi-sub">{sub}</div>
        <div className="kpi-spark"><Sparkline values={spark} /></div>
      </div>
    </div>
  );
}
