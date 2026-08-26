import { useEffect, useRef, useState } from 'react';

export default function CheckDropdown({ icon, label, options, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const summary = options.length === 0
    ? 'Nenhum disponível'
    : selected.size === options.length
      ? `Todos (${options.length})`
      : selected.size === 0
        ? 'Nenhum selecionado'
        : `${selected.size} de ${options.length}`;

  return (
    <div className="date-filter" ref={ref}>
      <button className="date-filter-btn" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        {icon}
        <span>{label}: {summary}</span>
      </button>
      <div className={'date-menu' + (open ? ' open' : '')} style={{ maxHeight: 280, overflowY: 'auto' }}>
        {options.length === 0 && <div className="date-menu-foot">Nenhuma opção nos dados atuais</div>}
        {options.map(o => (
          <label className="filter-check" key={o} style={{ padding: '9px 10px' }}>
            <input type="checkbox" checked={selected.has(o)} onChange={() => onToggle(o)} />
            <span className="flabel">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
