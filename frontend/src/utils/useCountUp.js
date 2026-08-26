import { useEffect, useState } from 'react';

export function useCountUp(target, formatter, duration = 900) {
  const [text, setText] = useState(formatter(0));

  useEffect(() => {
    let raf;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setText(formatter(target * eased));
      if (p < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return text;
}
