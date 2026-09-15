const API_BASE = import.meta.env.VITE_API_URL || '';

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

// Chamado (pelo AuthContext) toda vez que uma chamada volta 401 — sessao
// expirada ou token invalido. Devolve o usuario pra tela de login.
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function authHeaders(extra = {}) {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra;
}

async function handleUnauthorized(res, path) {
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  let detail = null;
  try {
    detail = (await res.json())?.detail;
  } catch {
    /* corpo nao era JSON, segue com mensagem generica */
  }
  throw new Error(detail || `Falha ao chamar ${path}: ${res.status}`);
}

async function getJson(path) {
  const res = await fetch(API_BASE + path, { headers: authHeaders() });
  if (!res.ok) return handleUnauthorized(res, path);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return handleUnauthorized(res, path);
  return res.json();
}

async function putJson(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) return handleUnauthorized(res, path);
  return res.json();
}

export const api = {
  login: (login, senha) => postJson('/api/auth/login', { login, senha }),
  me: () => getJson('/api/auth/me'),

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
