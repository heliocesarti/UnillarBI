import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import EmptyState from './components/EmptyState';
import Estoque from './views/estoque/Estoque';
import Configuracoes from './views/configuracoes/Configuracoes';
import { TooltipProvider } from './utils/TooltipContext';
import { getTelaInicial } from './utils/telaInicial';
import { api } from './api/client';

const TITLES = {
  'visao-geral': ['Visão Geral', 'Panorama consolidado da operação Unillar'],
  'vendas': ['Vendas', 'Desempenho comercial por filial e período'],
  'estoque': ['Estoque', 'Análise de ruptura'],
  'financeiro': ['Financeiro', 'Fluxo de caixa e comprometimento financeiro'],
  'configuracoes': ['Configurações', 'Parâmetros e regras de negócio de cada ambiente'],
};

// Subtítulo da Topbar quando o ambiente é Estoque muda por sub-aba (antes
// "Análise de ruptura" ficava fixo mesmo em Geral/Excesso/etc, que não têm
// nada a ver com ruptura). Chave = mesmo key de SUBTABS em Estoque.jsx.
const ESTOQUE_SUBTITLES = {
  'geral': 'Panorama consolidado do estoque',
  'sem-giro': 'Produtos sem movimentação recente',
  'ultimo-estoque': 'Produtos com a última unidade em estoque',
  'inativo-compra': 'Produtos inativos para compra',
  'margem': 'Análise de margem por produto',
  'excesso': 'Produtos com excesso de estoque',
  'indisponivel': 'Estoque parado ou indisponível pra venda',
  'ruptura': 'Análise de ruptura',
};

export default function App() {
  // Ambiente inicial: preferência pessoal salva no navegador (Configurações
  // > Preferências > Tela inicial), padrão "estoque" enquanto os outros
  // ambientes estão em manutenção.
  const [activeView, setActiveView] = useState(getTelaInicial);
  const [filial, setFilial] = useState('todas');

  // Sub-aba ativa de Estoque + status de sincronização vivem aqui (não
  // mais dentro de Estoque.jsx) pra que o botão único de "Sincronizar" no
  // Topbar saiba qual sub-aba está selecionada e o que disparar. `syncRef`
  // é preenchido pela sub-aba (Ruptura/Indisponível) montada no momento.
  // Se a tela inicial escolhida for Estoque, já abre direto na Ruptura
  // (única sub-aba de verdade funcionando hoje).
  const [estoqueSubtab, setEstoqueSubtab] = useState(() => getTelaInicial() === 'estoque' ? 'ruptura' : 'geral');
  const [estoqueSyncStatus, setEstoqueSyncStatus] = useState('idle');
  const estoqueSyncRef = useRef(null);

  useEffect(() => {
    setEstoqueSyncStatus('idle');
  }, [estoqueSubtab]);

  // Aplica a filial padrão configurada em Configurações > Estoque >
  // Ruptura (só no carregamento inicial da página — depois disso o
  // usuário controla pela Topbar normalmente). O filtro de dias NÃO fica
  // mais aqui — é específico da Ruptura (outras abas não têm janela de
  // tempo) e vive dentro dela, pra mudar lá não afetar mais nada global.
  useEffect(() => {
    api.getConfig()
      .then(all => {
        const cfg = all.ruptura;
        if (cfg?.tela_filial_padrao) setFilial(cfg.tela_filial_padrao);
      })
      .catch(() => {});
  }, []);

  const [title, tituloSubtitle] = TITLES[activeView];
  const subtitle = activeView === 'estoque'
    ? (ESTOQUE_SUBTITLES[estoqueSubtab] ?? tituloSubtitle)
    : tituloSubtitle;
  // Sincronizar e Limpar filtros só fazem sentido quando uma sub-aba de
  // Estoque com consulta/filtro próprio está selecionada.
  const mostrarAcoesEstoque = activeView === 'estoque' && ['ruptura'].includes(estoqueSubtab);

  return (
    <TooltipProvider>
      <div className="app-shell" data-ambiente={activeView}>
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="main">
          <Topbar
            title={title} subtitle={subtitle}
            filial={filial} onFilialChange={setFilial}
            mostrarFiltroFilial={!(activeView === 'estoque' && estoqueSubtab === 'ruptura')}
            showSync={mostrarAcoesEstoque}
            syncStatus={estoqueSyncStatus}
            onSincronizar={() => estoqueSyncRef.current?.sincronizar()}
            showLimparFiltros={mostrarAcoesEstoque}
            onLimparFiltros={() => estoqueSyncRef.current?.limparFiltros()}
          />
          <main className="content">
            <div className="view-anim">
              {activeView === 'visao-geral' && <EmptyState title="Visão Geral" message="Este ambiente está em manutenção." />}
              {activeView === 'vendas' && <EmptyState title="Vendas" message="Este ambiente está em manutenção." />}
              {activeView === 'estoque' && (
                <Estoque
                  filial={filial}
                  active={estoqueSubtab}
                  onActiveChange={setEstoqueSubtab}
                  syncRef={estoqueSyncRef}
                  onSyncStatusChange={setEstoqueSyncStatus}
                />
              )}
              {activeView === 'financeiro' && <EmptyState title="Financeiro" message="Este ambiente está em manutenção." />}
              {activeView === 'configuracoes' && <Configuracoes />}
            </div>
            <div className="page-footer">
              <span>
                Unillar BI © 2026
                <span className="footer-dev"> · Desenvolvido por Hélio Cesar</span>
              </span>
              <Clock />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <span>
      Atualizado às {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      <span className="footer-dev"> · v1.0</span>
    </span>
  );
}
