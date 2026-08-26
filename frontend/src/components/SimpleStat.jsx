import { useCountUp } from '../utils/useCountUp';

export default function SimpleStat({ label, value, formatter }) {
  const text = useCountUp(value, formatter);
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row" style={{ marginTop: 10 }}>
        <div className="kpi-value">{text}</div>
      </div>
    </div>
  );
}
