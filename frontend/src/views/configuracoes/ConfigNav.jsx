import { useState } from 'react';

const ChevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
);

export default function ConfigNav({ ambientes, selected, onSelect }) {
  const [expandidos, setExpandidos] = useState(() => new Set(selected ? [selected.ambiente] : []));

  function toggle(ambienteKey) {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(ambienteKey)) next.delete(ambienteKey);
      else next.add(ambienteKey);
      return next;
    });
  }

  return (
    <nav className="config-nav">
      {ambientes.map(amb => {
        const aberto = expandidos.has(amb.key);
        const ativoAqui = selected?.ambiente === amb.key;
        return (
          <div className={'config-nav-group' + (aberto ? ' open' : '')} key={amb.key}>
            <button
              type="button"
              className={'config-nav-header' + (ativoAqui ? ' active' : '')}
              onClick={() => toggle(amb.key)}
            >
              <span className="config-nav-header-label">{amb.label}</span>
              <span className="config-nav-chevron">{ChevronIcon}</span>
            </button>

            {aberto && (
              <div className="config-nav-list">
                {amb.modulos.map(mod => {
                  const isActive = selected?.ambiente === amb.key && selected?.modulo === mod.key;
                  const disponivel = mod.status === 'disponivel';
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      className={'config-nav-item' + (isActive ? ' active' : '')}
                      onClick={() => onSelect({
                        ambiente: amb.key,
                        ambienteLabel: amb.label,
                        modulo: mod.key,
                        label: mod.label,
                        status: mod.status,
                      })}
                    >
                      <span className="config-nav-item-label">{mod.label}</span>
                      {!disponivel && <span className="config-status-badge">Pendente</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
