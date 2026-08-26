import { useState } from 'react';
import { theme } from '../../theme';
import { fmtCurrency, fmtFull } from '../../utils/format';
import { roundedBarPath } from '../../utils/svgPaths';
import { useTooltip } from '../../utils/TooltipContext';

export default function DivergingChart({ title, subtitle, labels, pos, neg }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverKey, setHoverKey] = useState(null);
  const [tableVisible, setTableVisible] = useState(false);

  const W = 760, H = 300, padL = 60, padR = 16, padT = 20, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const slot = plotW / n;
  const barW = Math.min(30, slot * 0.45);
  const maxAbs = Math.max(...pos, ...neg.map(v => Math.abs(v))) * 1.15;
  const midY = padT + plotH / 2;
  const scale = (v) => (plotH / 2) * (v / maxAbs);

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
          {[0.5, 1].map(f => (
            <g key={f}>
              <line x1={padL} x2={W - padR} y1={midY - (plotH / 2) * f} y2={midY - (plotH / 2) * f} stroke={theme.gridLine} strokeWidth="1" />
              <line x1={padL} x2={W - padR} y1={midY + (plotH / 2) * f} y2={midY + (plotH / 2) * f} stroke={theme.gridLine} strokeWidth="1" />
            </g>
          ))}
          <line x1={padL} x2={W - padR} y1={midY} y2={midY} stroke={theme.divergingNeutral} strokeWidth="1.6" />
          {labels.map((l, i) => {
            const cx = padL + slot * i + slot / 2;
            const ph = scale(pos[i]);
            const nh = scale(Math.abs(neg[i]));
            const posKey = 'p' + i, negKey = 'n' + i;
            return (
              <g key={i}>
                <path
                  d={roundedBarPath(cx - barW / 2, midY - ph, barW, ph, 4)} fill={theme.series1} cursor="pointer" opacity={hoverKey === posKey ? 0.82 : 1}
                  onPointerMove={(e) => { setHoverKey(posKey); showTooltip(e.clientX, e.clientY, l, [{ color: theme.series1, name: 'Entradas', value: fmtFull(pos[i]) }]); }}
                  onPointerLeave={() => { setHoverKey(null); hideTooltip(); }}
                />
                <text x={cx} y={midY - ph - 8} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={theme.textPrimary}>{fmtCurrency(pos[i])}</text>
                <path
                  d={roundedBarPath(cx - barW / 2, midY, barW, nh, 4)} fill={theme.series8} cursor="pointer" opacity={hoverKey === negKey ? 0.82 : 1}
                  onPointerMove={(e) => { setHoverKey(negKey); showTooltip(e.clientX, e.clientY, l, [{ color: theme.series8, name: 'Saídas', value: fmtFull(neg[i]) }]); }}
                  onPointerLeave={() => { setHoverKey(null); hideTooltip(); }}
                />
                <text x={cx} y={midY + nh + 16} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={theme.textPrimary}>{fmtCurrency(neg[i])}</text>
                <text x={cx} y={H - 10} textAnchor="middle" fontSize="10.5" fill={theme.textMuted}>{l}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend">
        <div className="legend-item"><span className="legend-swatch" style={{ background: theme.series1 }} />Entradas</div>
        <div className="legend-item"><span className="legend-swatch" style={{ background: theme.series8 }} />Saídas</div>
      </div>
      {tableVisible && (
        <table className="data-table visible">
          <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={i}><td>{l}</td><td className="emph">{fmtFull(pos[i])}</td><td className="emph">{fmtFull(neg[i])}</td><td className="emph">{fmtFull(pos[i] + neg[i])}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
