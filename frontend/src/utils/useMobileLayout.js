import { useEffect, useState } from 'react';

// Celular em pé (retrato) e celular/tablet pequeno deitado (paisagem) usam
// tratamentos diferentes — texto abreviado e filtros compactos no 1º caso,
// gráficos mais compactos (menos barras, sem esticar) no 2º. Os 2 breakpoints
// espelham exatamente os usados no CSS (`index.css`, bloco "mobile").
const PORTRAIT_QUERY = '(max-width: 640px) and (orientation: portrait)';
const LANDSCAPE_QUERY = '(orientation: landscape) and (max-width: 1024px)';

function useMatchMedia(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return match;
}

export function useMobileLayout() {
  const portrait = useMatchMedia(PORTRAIT_QUERY);
  const landscape = useMatchMedia(LANDSCAPE_QUERY);
  return { portrait, landscape, isMobile: portrait || landscape };
}
