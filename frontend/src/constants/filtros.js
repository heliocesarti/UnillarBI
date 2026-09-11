export const RANGES = [
  { key: '7', label: 'Últimos 7 dias' },
  { key: '30', label: 'Últimos 30 dias' },
  { key: '60', label: 'Últimos 60 dias' },
  { key: '90', label: 'Últimos 90 dias' },
  { key: '12m', label: 'Últimos 12 meses' },
];

// Janela de "Vendas Período" da tela Excesso — opções vindas direto do
// filtro do Power BI (30/60/90/120/150/180 dias), diferente das opções da
// Ruptura acima.
export const RANGES_EXCESSO = [
  { key: '30', label: 'Últimos 30 dias' },
  { key: '60', label: 'Últimos 60 dias' },
  { key: '90', label: 'Últimos 90 dias' },
  { key: '120', label: 'Últimos 120 dias' },
  { key: '150', label: 'Últimos 150 dias' },
  { key: '180', label: 'Últimos 180 dias' },
];

// Códigos confirmados direto no banco (só leitura) em z_dw_002.filialvenda
// — a coluna realmente usada pra filtrar venda por filial em
// ruptura_query.py. Já filtra de verdade na aba Ruptura; as outras telas
// ainda são mock e ignoram esse valor.
export const FILIAIS = [
  { key: 'todas', label: 'Todas as filiais' },
  { key: '1', label: 'Filial 1' },
  { key: '2', label: 'Filial 2' },
  { key: '3', label: 'Filial 3' },
  { key: '4', label: 'Filial 4' },
  { key: '5', label: 'Filial 5' },
  { key: '6', label: 'Filial 6' },
  { key: '7', label: 'Filial 7' },
  { key: '8', label: 'Filial 8' },
  { key: '9', label: 'Filial 9' },
];
