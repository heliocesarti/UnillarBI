const NAV_ITEMS = [
  {
    key: 'visao-geral', label: 'Visão Geral',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  },
  {
    key: 'vendas', label: 'Vendas',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>,
  },
  {
    key: 'estoque', label: 'Estoque',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>,
  },
  {
    key: 'financeiro', label: 'Financeiro',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.2c0-1.2 1.1-2.2 2.5-2.2s2.5 .8 2.5 2c0 2.4-5 1.6-5 4 0 1.2 1.1 2 2.5 2s2.5-1 2.5-2.2" /></svg>,
  },
];

export default function Sidebar({ activeView, onNavigate, isAdmin }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Unillar" />
        <div className="brand-word"><b>Unillar BI</b><span>Painel de Análises</span></div>
      </div>

      <nav className="navlist">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={'nav-item' + (activeView === item.key ? ' active' : '')}
            onClick={() => onNavigate(item.key)}
          >
            {item.icon}
            <span className="label">{item.label}</span>
          </button>
        ))}
        {isAdmin && (
          <button
            className={'nav-item' + (activeView === 'configuracoes' ? ' active' : '')}
            onClick={() => onNavigate('configuracoes')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>
            <span className="label">Configurações</span>
          </button>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="conn-status">
          <span className="conn-dot online" />
          <div>
            <b>PostgreSQL</b>
            <span>conectado · produção</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
