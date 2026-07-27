import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

/**
 * True once the ref's element has scrolled into view, for the first time only.
 *
 * Falls back to `visible: true, instant: true` immediately when
 * IntersectionObserver isn't available (jsdom in tests) or the user prefers
 * reduced motion — callers should render their settled/final state without
 * animating when `instant` is true.
 */
export function useFirstVisible<T extends HTMLElement>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ visible: false, instant: false });

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      setState({ visible: true, instant: true });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState({ visible: true, instant: false });
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, ...state };
}
