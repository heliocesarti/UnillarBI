import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import VisaoGeral from './views/VisaoGeral';
import Vendas from './views/Vendas';
import Financeiro from './views/Financeiro';
import Estoque from './views/estoque/Estoque';
import Configuracoes from './views/configuracoes/Configuracoes';
import { TooltipProvider } from './utils/TooltipContext';

const TITLES = {
  'visao-geral': ['Visão Geral', 'Panorama consolidado da operação Unillar'],
  'vendas': ['Vendas', 'Desempenho comercial por filial e período'],
  'estoque': ['Estoque', 'Análise de ruptura'],
  'financeiro': ['Financeiro', 'Fluxo de caixa e comprometimento financeiro'],
  'configuracoes': ['Configurações', 'Período e situação usados pelas consultas de dados'],
};

export default function App() {
  const [activeView, setActiveView] = useState('visao-geral');
  const [dateRange, setDateRange] = useState('60');
  const [filial, setFilial] = useState('todas');

  const [title, subtitle] = TITLES[activeView];

  return (
    <TooltipProvider>
      <div className="app-shell">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="main">
          <Topbar title={title} subtitle={subtitle} dateRange={dateRange} onDateRangeChange={setDateRange} filial={filial} onFilialChange={setFilial} />
          <main className="content">
            <div className="view-anim">
              {activeView === 'visao-geral' && <VisaoGeral />}
              {activeView === 'vendas' && <Vendas />}
              {activeView === 'estoque' && <Estoque dateRange={dateRange} filial={filial} />}
              {activeView === 'financeiro' && <Financeiro />}
              {activeView === 'configuracoes' && <Configuracoes />}
            </div>
            <div className="page-footer">
              <span>Unillar BI · aba Ruptura conectada ao PostgreSQL de produção — demais telas ainda em demonstração</span>
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
  return <span>Atualizado às {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>;
}
