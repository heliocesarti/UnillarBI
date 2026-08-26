export function fmtCurrency(n) {
  if (Math.abs(n) >= 1000000) return "R$ " + (n / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M";
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "K";
  return "R$ " + n.toLocaleString('pt-BR');
}

export function fmtFull(n) {
  return "R$ " + Math.round(n).toLocaleString('pt-BR');
}

export function fmtNum(n) {
  return (n ?? 0).toLocaleString('pt-BR');
}
