import { theme } from '../theme';

export default function Sparkline({ values }) {
  const w = 108, h = 32, innerH = h - 4;
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => ({ x: i * step, y: innerH - ((v - min) / range) * innerH }));
  const mainD = 'M ' + pts.slice(0, -1).map(p => `${p.x},${p.y}`).join(' L ');
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <path d={mainD} fill="none" stroke={theme.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d={`M ${prev.x},${prev.y} L ${last.x},${last.y}`} fill="none" stroke={theme.series1} strokeWidth="2" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={theme.series1} stroke={theme.surface2} strokeWidth="2" />
    </svg>
  );
}
