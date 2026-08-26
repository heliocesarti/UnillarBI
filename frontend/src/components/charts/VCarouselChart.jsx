import { useState } from 'react';
import { theme } from '../../theme';
import { roundedBarPath } from '../../utils/svgPaths';
import { useTooltip } from '../../utils/TooltipContext';

export default function VCarouselChart({ title, subtitle, data, valueFormatter, selectedLabel, onBarClick }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverI, setHoverI] = useState(null);
  const [page, setPage] = useState(0);

  const safeData = data || [];
  const ITEMS_PER_PAGE = 5;
  const maxPage = Math.max(0, Math.ceil(safeData.length / ITEMS_PER_PAGE) - 1);
  const safePage = Math.min(page, maxPage);
  const visibleData = safeData.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const W = 400, H = 220, padL = 20, padR = 20, padT = 28, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = ITEMS_PER_PAGE;
  const slot = plotW / n;
  const barW = Math.min(34, slot * 0.6);

  // Escala fixa pelo maior valor de TODO o conjunto (não só da página visível),
  // senão cada página reescala pro seu próprio topo e a sequência decrescente
  // some visualmente ao trocar de página.
  const globalMax = Math.max(...safeData.map(d => d.value), 1);
  const maxV = globalMax * 1.18;
  const y = (v) => padT + plotH - (plotH * v / maxV);
  const baseY = y(0);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
        <div className="card-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {safePage > 0 && (
            <button className="icon-btn" onClick={() => setPage(p => p - 1)} title="Página Anterior">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {safePage < maxPage && (
            <button className="icon-btn" onClick={() => setPage(p => p + 1)} title="Próxima Página">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>
      </div>
      <div className="chart-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ maxHeight: 220 }}>
          {[0, 1, 2, 3].map(t => (
            <line key={t} x1={padL} x2={W - padR} y1={padT + plotH * t / 3} y2={padT + plotH * t / 3} stroke={theme.gridLine} strokeWidth="1" />
          ))}
          {visibleData.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            const bh = Math.max(2, plotH - (y(d.value) - padT));
            const shortLabel = d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label;

            const isSelected = selectedLabel === d.label;
            const dimmed = selectedLabel != null && !isSelected;

            return (
              <g key={i}>
                <path d={roundedBarPath(cx - barW / 2, y(d.value), barW, bh, 4)} fill={d.color || theme.series1} opacity={dimmed ? 0 : (hoverI === i ? 0.82 : 1)} />
                {!dimmed && (
                  <text x={cx} y={y(d.value) - 8} textAnchor="middle" fontSize="11" fontWeight={isSelected ? "700" : "600"} fill={theme.textPrimary}>{valueFormatter ? valueFormatter(d.value) : d.value}</text>
                )}
                <text x={cx} y={H - 14} textAnchor="middle" fontSize="10.5" fontWeight={isSelected ? "700" : "400"} fill={isSelected ? theme.textPrimary : theme.textMuted}>{shortLabel}</text>
                <rect
                  x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" cursor="pointer"
                  onClick={() => onBarClick && onBarClick(d, i)}
                  onPointerMove={(e) => { setHoverI(i); showTooltip(e.clientX, e.clientY, d.label, [{ color: d.color || theme.series1, name: 'Valor', value: valueFormatter ? valueFormatter(d.value) : d.value }]); }}
                  onPointerLeave={() => { setHoverI(null); hideTooltip(); }}
                />
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke={theme.baseline} strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}
