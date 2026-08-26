async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status}`);
  return res.json();
}

async function postJson(path) {
  const res = await fetch(path, { method: 'POST' });
  if (!res.ok) throw new Error(`Falha ao chamar ${path}: ${res.status}`);
  return res.json();
}

async function putJson(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Falha ao chamar ${path}: ${res.status}`);
  return res.json();
}

export const api = {
  getVisaoGeral: () => getJson('/api/visao-geral'),
  getVendas: () => getJson('/api/vendas'),
  getEstoqueGeral: () => getJson('/api/estoque/geral'),
  getEstoqueRuptura: (dias = 60, filial = 'todas') => getJson(`/api/estoque/ruptura?dias=${dias}&filial=${filial}`),
  atualizarEstoqueRuptura: () => postJson('/api/estoque/ruptura/atualizar'),
  getFinanceiro: () => getJson('/api/financeiro'),
  getConfig: () => getJson('/api/config'),
  updateRupturaConfig: (cfg) => putJson('/api/config/ruptura', cfg),
  resetRupturaConfig: () => postJson('/api/config/ruptura/reset'),
};
