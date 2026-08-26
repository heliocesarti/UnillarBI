import { useState } from 'react';
import { theme } from '../../theme';
import { roundedBarPathRight } from '../../utils/svgPaths';
import { useTooltip } from '../../utils/TooltipContext';

const MAX_LABEL_CHARS = 16;
function truncateLabel(label) {
  return label.length > MAX_LABEL_CHARS ? label.slice(0, MAX_LABEL_CHARS - 1) + '…' : label;
}

export default function HBarChart({ title, subtitle, data, valueFormatter, scrollable = false, onBarClick, selectedLabel }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverI, setHoverI] = useState(null);

  const rowH = 16, gap = 6;
  const padL = 128, padR = 58, padT = 6, padB = 6;
  const W = 460;
  const H = padT + Math.max(data.length, 1) * (rowH + gap) - gap + padB;
  const maxV = Math.max(...data.map(d => d.value), 1) * 1.14;
  const plotW = W - padL - padR;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className={'chart-wrap' + (scrollable ? ' chart-scroll' : '')}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          {data.map((d, i) => {
            const y = padT + i * (rowH + gap);
            const w = Math.max(2, plotW * d.value / maxV);
            const isSelected = selectedLabel === d.label;
            const dimmed = selectedLabel != null && !isSelected;
            return (
              <g key={i}>
                <text x={padL - 10} y={y + rowH / 2 + 4} textAnchor="end" fontSize="11" fontWeight={isSelected ? 700 : 400} fill={isSelected ? theme.textPrimary : theme.textMuted}>{truncateLabel(d.label)}</text>
                <path
                  d={roundedBarPathRight(padL, y, w, rowH, 4)} fill={theme.series1} cursor="pointer"
                  opacity={dimmed ? 0.35 : (hoverI === i ? 0.8 : 1)}
                  onClick={() => onBarClick && onBarClick(d, i)}
                  onPointerMove={(e) => { setHoverI(i); showTooltip(e.clientX, e.clientY, d.label, [{ color: theme.series1, name: 'Valor', value: valueFormatter(d.value) }]); }}
                  onPointerLeave={() => { setHoverI(null); hideTooltip(); }}
                />
                <text x={padL + w + 8} y={y + rowH / 2 + 4} textAnchor="start" fontSize="11" fontWeight="700" fill={dimmed ? theme.textMuted : theme.textPrimary}>{valueFormatter(d.value)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
