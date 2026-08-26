import { useRef, useState } from 'react';
import { theme } from '../../theme';
import { fmtCurrency, fmtFull } from '../../utils/format';
import { useTooltip } from '../../utils/TooltipContext';

function toSVGPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

export default function LineChart({ title, subtitle, labels, values, seriesName, seriesColor = theme.series1 }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tableVisible, setTableVisible] = useState(false);

  const W = 760, H = 300, padL = 56, padR = 16, padT = 18, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxV = Math.max(...values) * 1.12;
  const ticks = 4;
  const gradId = 'grad-' + title.replace(/\s+/g, '');

  const x = (i) => padL + (plotW * i / (values.length - 1));
  const y = (v) => padT + plotH - (plotH * v / maxV);

  let areaD = `M ${x(0)},${y(values[0])}`;
  values.forEach((v, i) => { if (i > 0) areaD += ` L ${x(i)},${y(v)}`; });
  areaD += ` L ${x(values.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`;

  let lineD = `M ${x(0)},${y(values[0])}`;
  values.forEach((v, i) => { if (i > 0) lineD += ` L ${x(i)},${y(v)}`; });

  const lastX = x(values.length - 1), lastY = y(values[values.length - 1]);

  function handleMove(e) {
    const p = toSVGPoint(svgRef.current, e.clientX, e.clientY);
    let idx = Math.round((p.x - padL) / plotW * (values.length - 1));
    idx = Math.max(0, Math.min(values.length - 1, idx));
    setHoverIdx(idx);
    showTooltip(e.clientX, e.clientY, labels[idx], [{ color: seriesColor, name: seriesName, value: fmtFull(values[idx]) }]);
  }
  function handleLeave() {
    setHoverIdx(null);
    hideTooltip();
  }

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
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={seriesColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: ticks + 1 }).map((_, t) => {
            const v = maxV * t / ticks;
            const yy = y(v);
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke={theme.gridLine} strokeWidth="1" />
                <text x={padL - 10} y={yy + 4} textAnchor="end" fontSize="10.5" fill={theme.textMuted}>{fmtCurrency(v)}</text>
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke={theme.baseline} strokeWidth="1.4" />
          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={lineD} fill="none" stroke={seriesColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {labels.map((l, i) => (i % 2 !== 0 && i !== labels.length - 1) ? null : (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10.5" fill={theme.textMuted}>{l}</text>
          ))}
          <circle cx={lastX} cy={lastY} r="5" fill={seriesColor} stroke={theme.surface2} strokeWidth="2" />
          <text x={lastX} y={lastY - 14} textAnchor="end" fontSize="12" fontWeight="700" fill={theme.textPrimary}>{fmtCurrency(values[values.length - 1])}</text>

          {hoverIdx !== null && (
            <>
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT} y2={H - padB} stroke={theme.textMuted} strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={x(hoverIdx)} cy={y(values[hoverIdx])} r="5" fill={seriesColor} stroke={theme.surface2} strokeWidth="2" />
            </>
          )}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" onPointerMove={handleMove} onPointerLeave={handleLeave} />
        </svg>
      </div>
      {tableVisible && (
        <table className="data-table visible">
          <thead><tr><th>Mês</th><th>{seriesName}</th></tr></thead>
          <tbody>
            {labels.map((l, i) => <tr key={i}><td>{l}</td><td className="emph">{fmtFull(values[i])}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
