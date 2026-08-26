import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';

const TooltipCtx = createContext(null);

export function TooltipProvider({ children }) {
  const [state, setState] = useState(null); // { clientX, clientY, title, rows }
  const elRef = useRef(null);

  const showTooltip = useCallback((clientX, clientY, title, rows) => {
    setState({ clientX, clientY, title, rows });
  }, []);
  const hideTooltip = useCallback(() => setState(null), []);

  useLayoutEffect(() => {
    if (!state || !elRef.current) return;
    const pad = 14;
    const rect = elRef.current.getBoundingClientRect();
    let x = state.clientX + pad;
    let y = state.clientY - rect.height - pad;
    if (x + rect.width > window.innerWidth - 8) x = state.clientX - rect.width - pad;
    if (y < 8) y = state.clientY + pad;
    elRef.current.style.transform = `translate(${x}px,${y}px)`;
  }, [state]);

  return (
    <TooltipCtx.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      <div id="viz-tooltip" ref={elRef} className={state ? 'show' : ''}>
        {state && (
          <>
            <div className="tt-title">{state.title}</div>
            {state.rows.map((r, i) => (
              <div className="tt-row" key={i}>
                {r.color && <span className="tt-key" style={{ background: r.color }} />}
                <span className="tt-name">{r.name}</span>
                <span className="tt-value">{r.value}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </TooltipCtx.Provider>
  );
}

export function useTooltip() {
  const ctx = useContext(TooltipCtx);
  if (!ctx) throw new Error('useTooltip must be used within TooltipProvider');
  return ctx;
}
