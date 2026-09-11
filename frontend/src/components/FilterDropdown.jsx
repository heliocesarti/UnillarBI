import { useEffect, useRef, useState } from 'react';

export default function FilterDropdown({ icon, options, selectedKey, onSelect, footer }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const selectedLabel = options.find(o => o.key === selectedKey)?.label ?? options[0]?.label;

  return (
    <div className="date-filter" ref={ref}>
      <button className="date-filter-btn" onClick={() => setOpen(o => !o)}>
        {icon}
        <span>{selectedLabel}</span>
        <svg className={'date-filter-chevron' + (open ? ' open' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className={'date-menu' + (open ? ' open' : '')}>
        {options.map(o => (
          <button
            key={o.key}
            className={'date-menu-row' + (selectedKey === o.key ? ' selected' : '')}
            onClick={() => { onSelect(o.key); setOpen(false); }}
          >
            {o.label}
            <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>
          </button>
        ))}
        {footer && <div className="date-menu-foot">{footer}</div>}
      </div>
    </div>
  );
}
