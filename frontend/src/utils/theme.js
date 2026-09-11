// Tema claro/escuro é preferência pessoal de quem está olhando a tela —
// fica salvo só no navegador (localStorage), não no servidor, então cada
// operador escolhe o que prefere sem afetar os outros.
import { refreshChartTheme } from '../theme';

const KEY = 'unillarbi_theme';

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* navegador sem localStorage — só não persiste */ }
  applyTheme(theme);
  // Gráficos SVG (D3-em-React) pegam cor de uma paleta JS separada, não
  // de var(--...) do CSS — precisa avisar ela também pra próxima vez que
  // qualquer gráfico renderizar já vir com a cor certa.
  refreshChartTheme();
}
