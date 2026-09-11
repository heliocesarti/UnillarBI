// Ambiente que abre quando o sistema carrega — preferência pessoal de quem
// usa a tela, salva só no navegador (localStorage), igual o tema (ver
// utils/theme.js). Hoje só Estoque > Ruptura funciona de verdade (os
// outros ambientes estão em manutenção), por isso é o padrão até alguém
// mudar aqui.
const KEY = 'unillarbi_tela_inicial';
const VALIDOS = ['visao-geral', 'vendas', 'estoque', 'financeiro'];

export function getTelaInicial() {
  try {
    const v = localStorage.getItem(KEY);
    return VALIDOS.includes(v) ? v : 'estoque';
  } catch {
    return 'estoque';
  }
}

export function setTelaInicial(valor) {
  try {
    localStorage.setItem(KEY, valor);
  } catch {
    /* navegador sem localStorage — só não persiste */
  }
}
