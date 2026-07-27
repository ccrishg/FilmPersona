export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** Starts fast, decelerates smoothly into the final value. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
