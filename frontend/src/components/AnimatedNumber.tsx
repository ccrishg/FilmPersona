import { useEffect, useRef, useState } from "react";
import { useFirstVisible } from "../hooks/useFirstVisible";
import { easeOutCubic, prefersReducedMotion } from "../lib/motion";

function isInstant(): boolean {
  return typeof IntersectionObserver === "undefined" || prefersReducedMotion();
}

/** Counts up from 0 to `value`, with an ease-out, the first time it scrolls into view. */
export function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 1000,
}: {
  value: number;
  decimals?: number;
  durationMs?: number;
}) {
  const { ref, visible, instant } = useFirstVisible<HTMLSpanElement>();
  const [display, setDisplay] = useState(() => (isInstant() ? value : 0));
  const startedRef = useRef(false);

  useEffect(() => {
    if (!visible || startedRef.current) return;
    startedRef.current = true;
    if (instant) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(value * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, instant, value, durationMs]);

  return <span ref={ref}>{display.toFixed(decimals)}</span>;
}
