import { useState } from 'react';
import { theme } from '../../theme';
import { fmtCurrency } from '../../utils/format';
import { useTooltip } from '../../utils/TooltipContext';

export default function DonutChart({ title, subtitle, data, centerFormatter = fmtCurrency, onSegmentClick, selectedKeys, size = 220, strokeWidth = 26 }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverI, setHoverI] = useState(null);

  const cx = size / 2, cy = size / 2, sw = strokeWidth, r = size / 2 - sw / 2 - 5;
  const bigFont = Math.round(size * 0.086), smallFont = Math.round(size * 0.043);
  const total = data.reduce((a, d) => a + d.value, 0);
  const circumference = 2 * Math.PI * r;
  const gapDeg = 2;
  let offset = 0;
  const segments = data.map(d => {
    const frac = d.value / total;
    const len = circumference * frac - (circumference * gapDeg / 360);
    const seg = { ...d, frac, len: Math.max(len, 0), offset };
    offset += circumference * frac;
    return seg;
  });

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={theme.gridLine} strokeWidth={sw} />
          {segments.map((s, i) => {
            const dimmed = selectedKeys && !selectedKeys.has(s.key);
            return (
              <circle
                key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={hoverI === i ? sw + 4 : sw}
                strokeDasharray={`${s.len} ${circumference}`} strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" cursor="pointer"
                opacity={dimmed ? 0.3 : 1}
                onClick={() => onSegmentClick && onSegmentClick(s, i)}
                onPointerMove={(e) => { setHoverI(i); showTooltip(e.clientX, e.clientY, s.label, [{ color: s.color, name: 'Participação', value: (s.frac * 100).toFixed(1) + '%' }]); }}
                onPointerLeave={() => { setHoverI(null); hideTooltip(); }}
              />
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={bigFont} fontWeight="700" fill={theme.textPrimary}>{centerFormatter(total)}</text>
          <text x={cx} y={cy + smallFont + 6} textAnchor="middle" fontSize={smallFont} fill={theme.textMuted}>TOTAL</text>
        </svg>
      </div>
      <div className="legend">
        {data.map((d, i) => (
          <div
            className="legend-item" key={i}
            style={{ cursor: onSegmentClick ? 'pointer' : 'default', opacity: selectedKeys && !selectedKeys.has(d.key) ? 0.4 : 1 }}
            onClick={() => onSegmentClick && onSegmentClick(d, i)}
          >
            <span className="legend-swatch" style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="legend-val">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
