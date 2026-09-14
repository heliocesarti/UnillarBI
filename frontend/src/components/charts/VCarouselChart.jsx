import { useEffect, useState } from 'react';
import { theme } from '../../theme';
import { roundedBarPath } from '../../utils/svgPaths';
import { useTooltip } from '../../utils/TooltipContext';

// Celular em pé: a largura real disponível pro cartão fica bem menor que a
// dos cartões de desktop (que o gráfico foi desenhado pra preencher — 400
// unidades de largura no viewBox). Como o SVG escala tudo proporcionalmente
// (`width:100%`), renderizar as mesmas 400 unidades num cartão estreito
// encolhe o texto junto (uma fonte "11" vira uns 7px reais) — ilegível.
// Reduzindo o viewBox (W/H) só nesse caso, a MESMA largura em pixels reais
// passa a valer mais "zoom" (escala > 1), sem tocar em nada no desktop nem
// no celular deitado (a viewport fica larga o bastante pra sair da consulta
// abaixo em qualquer aparelho real).
const MOBILE_PORTRAIT_QUERY = '(max-width: 640px) and (orientation: portrait)';

function useMobilePortrait() {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_PORTRAIT_QUERY).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const handler = (e) => setMatch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return match;
}

export default function VCarouselChart({ title, subtitle, data, valueFormatter, selectedLabel, onBarClick, truncateAt = 8, height = 220, compress = false }) {
  const { showTooltip, hideTooltip } = useTooltip();
  const [hoverI, setHoverI] = useState(null);
  const [page, setPage] = useState(0);
  const isMobilePortrait = useMobilePortrait();

  const safeData = data || [];
  const ITEMS_PER_PAGE = 5;
  const maxPage = Math.max(0, Math.ceil(safeData.length / ITEMS_PER_PAGE) - 1);
  const safePage = Math.min(page, maxPage);
  const visibleData = safeData.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const W = isMobilePortrait ? 280 : 400, H = isMobilePortrait ? 260 : height, padL = 20, padR = 20, padT = 28, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = ITEMS_PER_PAGE;
  const slot = plotW / n;
  const barW = Math.min(34, slot * 0.6);

  // Escala fixa pelo maior valor de TODO o conjunto (não só da página visível),
  // senão cada página reescala pro seu próprio topo e a sequência decrescente
  // some visualmente ao trocar de página.
  const globalMax = Math.max(...safeData.map(d => d.value), 1);
  const maxV = globalMax * 1.18;
  // `compress` usa raiz quadrada em vez de escala linear — só pra ALTURA
  // visual da barra. Continua ordenado e crescente com o valor (nunca
  // inverte nem empata o que era diferente), mas um valor bem menor que o
  // maior do conjunto (ex.: 1% dele) deixa de ficar visualmente ~1% da
  // altura e passa a ~10%, o suficiente pra não sumir/ficar difícil de
  // mirar quando um item domina demais os outros. O valor exato mostrado
  // no rótulo em cima da barra nunca muda — só a altura é comprimida.
  const scale = compress ? Math.sqrt : (v) => v;
  const scaledMaxV = scale(maxV);
  const y = (v) => padT + plotH - (plotH * scale(Math.max(v, 0)) / scaledMaxV);
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
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ maxHeight: H }}>
          {[0, 1, 2, 3].map(t => (
            <line key={t} x1={padL} x2={W - padR} y1={padT + plotH * t / 3} y2={padT + plotH * t / 3} stroke={theme.gridLine} strokeWidth="1" />
          ))}
          {visibleData.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            // Piso mínimo de altura visível pra barra pequena não sumir
            // (ficava em 2px, quase invisível e difícil de mirar) — o
            // alvo de clique (o <rect> abaixo) já cobre a coluna inteira,
            // isso aqui é só pra dar afordância visual mesmo com valor
            // muito menor que o resto do gráfico. A base da barra fica
            // SEMPRE em `baseY` — o piso mínimo só sobe o topo, nunca deixa
            // a barra crescer pra baixo da linha (bug corrigido: antes o
            // topo ficava fixo em y(d.value) e só a altura crescia, o que
            // empurrava o fundo da barra pra baixo da linha de base).
            const bh = Math.max(6, baseY - y(d.value));
            const barTop = baseY - bh;
            const shortLabel = d.label.length > truncateAt + 1 ? d.label.slice(0, truncateAt) + '…' : d.label;

            // `selectedLabel` aceita tanto uma string única (uso antigo,
            // seleção exclusiva) quanto um Set (múltipla escolha) — quem
            // chama decide qual dos dois passar, sem mudar assinatura.
            const isSelected = selectedLabel instanceof Set ? selectedLabel.has(d.label) : selectedLabel === d.label;
            const hasSelection = selectedLabel instanceof Set ? selectedLabel.size > 0 : selectedLabel != null;
            const dimmed = hasSelection && !isSelected;

            return (
              <g key={i}>
                <path d={roundedBarPath(cx - barW / 2, barTop, barW, bh, 4)} fill={d.color || theme.series1} opacity={dimmed ? 0 : (hoverI === i ? 0.82 : 1)} />
                {!dimmed && (
                  <text x={cx} y={barTop - 8} textAnchor="middle" fontSize="11" fontWeight={isSelected ? "700" : "600"} fill={theme.textPrimary}>{valueFormatter ? valueFormatter(d.value) : d.value}</text>
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
