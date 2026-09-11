import { useEffect, useRef, useState } from 'react';

const ChevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
);
const CheckIcon = (
  <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>
);

export default function AccordionSelect({ label, help, options, selectedKey, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const selectedLabel = options.find(o => o.key === selectedKey)?.label ?? selectedKey;

  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-label">{label}</div>
        {help && <div className="settings-row-help">{help}</div>}
      </div>
      <div className="settings-float-anchor" ref={ref}>
        <button type="button" className={'settings-row-current' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
          <span>{selectedLabel}</span>
          {ChevronIcon}
        </button>

        {open && (
          <div className="settings-float-menu">
            {options.map(o => (
              <button
                key={o.key}
                type="button"
                className={'settings-float-item' + (o.key === selectedKey ? ' selected' : '')}
                onClick={() => { onSelect(o.key); setOpen(false); }}
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
