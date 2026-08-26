export const theme = {
  surface1: '#0F1A33',
  surface2: '#111D3A',
  surface3: '#16234A',
  surface4: '#1B2A54',
  textPrimary: '#F5F7FB',
  textSecondary: '#AAB8D6',
  textMuted: '#6E7EA3',
  gridLine: '#1E2B4E',
  baseline: '#2C3B63',

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

  divergingNeutral: '#303F5E',

  statusGood: '#0ca30c',
  statusWarning: '#fab219',
  statusSerious: '#ec835a',
  statusCritical: '#d03b3b',

  riskNone: '#5A6B8C',
  riskMedia: '#3987e5',
  riskAlta: '#fab219',
  riskUrgencia: '#d03b3b',
  riskEmergencia: '#7A1420',
};

export const seriesColors = [
  theme.series1, theme.series2, theme.series3, theme.series4,
  theme.series5, theme.series6, theme.series7, theme.series8,
];

// Assigns fixed categorical colors, in order, to data coming from the API
// (the API returns business data only — color is a presentation concern).
export function withSeriesColors(items) {
  return items.map((item, i) => ({ ...item, color: seriesColors[i % seriesColors.length] }));
}
