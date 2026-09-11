// Paleta usada pelos gráficos SVG (D3-em-React) — eles desenham cor
// direto no atributo do SVG (fill/stroke), não dá pra usar var(--...) do
// CSS ali. Por isso a paleta de fundo/texto/grade é espelhada aqui, uma
// cópia por tema, e trocada junto quando o usuário troca o tema em
// Configurações → Preferências → Aparência (ver utils/theme.js).
const PALETAS = {
  dark: {
    surface1: '#0F1A33',
    surface2: '#111D3A',
    surface3: '#16234A',
    surface4: '#1B2A54',
    textPrimary: '#F5F7FB',
    textSecondary: '#AAB8D6',
    textMuted: '#6E7EA3',
    gridLine: '#1E2B4E',
    baseline: '#2C3B63',
    divergingNeutral: '#303F5E',
  },
  light: {
    surface1: '#FFFFFF',
    surface2: '#FFFFFF',
    surface3: '#F6F8FC',
    surface4: '#ECF0F8',
    textPrimary: '#131A2C',
    textSecondary: '#4B5773',
    textMuted: '#8891A8',
    gridLine: '#E3E7F1',
    baseline: '#C8CEDD',
    divergingNeutral: '#94A0C0',
  },
};

// Cores de marca/dados: não mudam entre temas de propósito — são cores
// categóricas/semânticas (série de gráfico, status, risco), reconhecíveis
// da mesma forma independente do fundo.
const FIXAS = {
  brandRed: '#FF0000',

  series1: '#3987e5',
  series2: '#1baf7a',
  series3: '#d55181',
  series4: '#c98500',
  series5: '#199e70',
  series6: '#d95926',
  series7: '#9085e9',
  series8: '#e66767',

  seq: ['#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],

  statusGood: '#0ca30c',
  statusWarning: '#fab219',
  statusSerious: '#ec835a',
  statusCritical: '#d03b3b',

  riskNone: '#5A6B8C',
  riskMedia: '#3987e5',
  riskAlta: '#fab219',
  riskUrgencia: '#d03b3b',
  riskEmergencia: '#7A1420',
  riskRuptura: '#FF1744',
};

function paletaAtual() {
  try {
    return localStorage.getItem('unillarbi_theme') === 'light' ? PALETAS.light : PALETAS.dark;
  } catch {
    return PALETAS.dark;
  }
}

// Objeto mutável, não uma cópia: todo componente de gráfico já importa
// `{ theme }` e lê `theme.textPrimary` etc. dentro do próprio render, então
// mutar as propriedades aqui (via refreshChartTheme) é suficiente pra
// qualquer novo render pegar a cor certa — não precisa mudar nenhum
// componente de gráfico existente.
export const theme = { ...FIXAS, ...paletaAtual() };

// Chamado pelo utils/theme.js sempre que o usuário troca o tema, pra essa
// paleta de gráficos acompanhar.
export function refreshChartTheme() {
  Object.assign(theme, paletaAtual());
}

export const seriesColors = [
  theme.series1, theme.series2, theme.series3, theme.series4,
  theme.series5, theme.series6, theme.series7, theme.series8,
];

// Assigns fixed categorical colors, in order, to data coming from the API
// (the API returns business data only — color is a presentation concern).
export function withSeriesColors(items) {
  return items.map((item, i) => ({ ...item, color: seriesColors[i % seriesColors.length] }));
}
