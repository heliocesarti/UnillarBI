const API_BASE = import.meta.env.VITE_API_URL || '';

async function getJson(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status}`);
  return res.json();
}

async function postJson(path) {
  const res = await fetch(API_BASE + path, { method: 'POST' });
  if (!res.ok) throw new Error(`Falha ao chamar ${path}: ${res.status}`);
  return res.json();
}

async function putJson(path, body) {
  const res = await fetch(API_BASE + path, {
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
  getRupturaClassificacoes: () => getJson('/api/estoque/ruptura/classificacoes'),
  getEstoqueIndisponivel: (filial = 'todas') => getJson(`/api/estoque/indisponivel?filial=${filial}`),
  atualizarEstoqueIndisponivel: () => postJson('/api/estoque/indisponivel/atualizar'),
  getEstoqueExcesso: (dias = 60, filial = 'todas') => getJson(`/api/estoque/excesso?dias=${dias}&filial=${filial}`),
  atualizarEstoqueExcesso: () => postJson('/api/estoque/excesso/atualizar'),
  getFinanceiro: () => getJson('/api/financeiro'),
  getConfig: () => getJson('/api/config'),
  getConfigRegistry: () => getJson('/api/config/registry'),
  updateRupturaConfig: (cfg) => putJson('/api/config/ruptura', cfg),
  resetRupturaConfig: () => postJson('/api/config/ruptura/reset'),
  updateIndisponivelConfig: (cfg) => putJson('/api/config/indisponivel', cfg),
  resetIndisponivelConfig: () => postJson('/api/config/indisponivel/reset'),
  updateVisibilidadeConfig: (cfg) => putJson('/api/config/visibilidade', cfg),
  resetVisibilidadeConfig: () => postJson('/api/config/visibilidade/reset'),
};
