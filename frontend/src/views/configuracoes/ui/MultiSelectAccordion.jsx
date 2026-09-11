import { useEffect, useRef, useState } from 'react';

const ChevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
);
const CheckIcon = (
  <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>
);

export default function MultiSelectAccordion({ label, help, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const selecionadas = options.filter(o => selected.includes(o.key));
  const resumo = selecionadas.length === 0
    ? 'Nenhuma selecionada'
    : selecionadas.length === options.length
      ? 'Todas selecionadas'
      : selecionadas.map(o => o.label).join(', ');

  function toggleOpcao(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(Array.from(next));
  }

  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-label">{label}</div>
        {help && <div className="settings-row-help">{help}</div>}
      </div>
      <div className="settings-float-anchor" ref={ref}>
        <button type="button" className={'settings-row-current' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
          <span>{resumo}</span>
          {ChevronIcon}
        </button>

        {open && (
          <div className="settings-float-menu">
            {options.map(o => (
              <button
                key={o.key}
                type="button"
                className={'settings-float-item' + (selected.includes(o.key) ? ' selected' : '')}
                onClick={() => toggleOpcao(o.key)}
              >
                {o.label}
                {CheckIcon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
