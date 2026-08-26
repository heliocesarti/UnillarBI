import { useState } from 'react';
import { theme } from '../../theme';
import { fmtNum } from '../../utils/format';
import { useTooltip } from '../../utils/TooltipContext';

export default function Heatmap({ title, subtitle, days, periods, matrix }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverCell, setHoverCell] = useState(null);

  const padL = 54, padT = 10, padB = 26, cellGap = 4;
  const cellW = 56, cellH = 46;
  const W = padL + days.length * (cellW + cellGap), H = padT + periods.length * (cellH + cellGap) + padB;
  const flat = matrix.flat();
  const minV = Math.min(...flat), maxV = Math.max(...flat);
  const ramp = theme.seq;

  function colorFor(v) {
    const t = (v - minV) / (maxV - minV || 1);
    const idx = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
    return ramp[idx];
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`}>
          {periods.map((p, pi) => (
            <text key={pi} x={padL - 10} y={padT + pi * (cellH + cellGap) + cellH / 2 + 4} textAnchor="end" fontSize="10.5" fill={theme.textMuted}>{p}</text>
          ))}
          {days.map((d, di) => (
            <text key={di} x={padL + di * (cellW + cellGap) + cellW / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill={theme.textMuted}>{d}</text>
          ))}
          {days.map((d, di) => periods.map((p, pi) => {
            const v = matrix[di][pi];
            const x = padL + di * (cellW + cellGap), y = padT + pi * (cellH + cellGap);
            const isHover = hoverCell && hoverCell[0] === di && hoverCell[1] === pi;
            return (
              <rect
                key={di + '-' + pi} x={x} y={y} width={cellW} height={cellH} rx={6} fill={colorFor(v)} cursor="pointer"
                stroke={isHover ? '#fff' : 'none'} strokeWidth={isHover ? 1.5 : 0} strokeOpacity={0.5}
                onPointerMove={(e) => { setHoverCell([di, pi]); showTooltip(e.clientX, e.clientY, `${d} · ${p}`, [{ name: 'Pedidos', value: fmtNum(v) }]); }}
                onPointerLeave={() => { setHoverCell(null); hideTooltip(); }}
              />
            );
          }))}
        </svg>
      </div>
      <div className="legend">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="legend-val">menor volume</span>
          {ramp.map((c, i) => <span key={i} style={{ width: 14, height: 10, borderRadius: 2, background: c }} />)}
          <span className="legend-val">maior volume</span>
        </div>
      </div>
    </div>
  );
}
