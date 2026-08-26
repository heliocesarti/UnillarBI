import { useState } from 'react';
import { theme } from '../../theme';
import { roundedBarPath } from '../../utils/svgPaths';
import { useTooltip } from '../../utils/TooltipContext';

export default function BarChart({ title, subtitle, data, unitFormatter }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverI, setHoverI] = useState(null);
  const [tableVisible, setTableVisible] = useState(false);

  const W = 500, H = 280, padL = 20, padR = 20, padT = 20, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.min(30, slot * 0.5);
  const maxV = Math.max(...data.map(d => d.value)) * 1.18;
  const y = (v) => padT + plotH - (plotH * v / maxV);
  const baseY = y(0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
        <div className="card-actions">
          <button className="icon-btn" onClick={() => setTableVisible(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></svg>
            {tableVisible ? 'Ocultar tabela' : 'Ver tabela'}
          </button>
        </div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`}>
          {[0, 1, 2, 3].map(t => (
            <line key={t} x1={padL} x2={W - padR} y1={padT + plotH * t / 3} y2={padT + plotH * t / 3} stroke={theme.gridLine} strokeWidth="1" />
          ))}
          {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            const bh = plotH - (y(d.value) - padT);
            const words = d.label.split(' ');
            const shortLabel = words.length > 1 && d.label.length > 10 ? words[0] : d.label;
            return (
              <g key={i}>
                <path d={roundedBarPath(cx - barW / 2, y(d.value), barW, bh, 4)} fill={d.color} opacity={hoverI === i ? 0.82 : 1} />
                <text x={cx} y={y(d.value) - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={theme.textPrimary}>{unitFormatter(d.value)}</text>
                <text x={cx} y={H - 14} textAnchor="middle" fontSize="10" fill={theme.textMuted}>{shortLabel}</text>
                <rect
                  x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" cursor="pointer"
                  onPointerMove={(e) => { setHoverI(i); showTooltip(e.clientX, e.clientY, d.label, [{ color: d.color, name: 'Valor', value: unitFormatter(d.value) }]); }}
                  onPointerLeave={() => { setHoverI(null); hideTooltip(); }}
                />
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke={theme.baseline} strokeWidth="1.4" />
        </svg>
      </div>
      {tableVisible && (
        <table className="data-table visible">
          <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
          <tbody>
            {data.map((d, i) => <tr key={i}><td>{d.label}</td><td className="emph">{unitFormatter(d.value)}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
