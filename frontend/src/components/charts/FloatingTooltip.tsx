import { useRef, useState } from "react";

interface HoverPosition {
  x: number;
  y: number;
  flip: boolean;
}

/**
 * Tracks a hovered chart element (positioned relative to a container ref) so a
 * `FloatingTooltip` can follow the cursor and flip away from the right edge.
 */
export function useFloatingTooltip<T>() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<(T & HoverPosition) | null>(null);

  function handleMove(event: React.MouseEvent, data: T) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    setHover({
      ...data,
      x,
      y: event.clientY - rect.top,
      flip: x > rect.width * 0.7,
    });
  }

  function clear() {
    setHover(null);
  }

  return { containerRef, hover, handleMove, clear };
}

/** Small floating card, positioned near the cursor by `useFloatingTooltip`. */
export function FloatingTooltip({
  x,
  y,
  flip,
  children,
}: HoverPosition & { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-night-border
                 bg-night-soft px-3 py-2 text-xs shadow-lg"
      style={{
        top: y + 14,
        ...(flip ? { right: `calc(100% - ${x - 12}px)` } : { left: x + 12 }),
      }}
    >
      {children}
    </div>
  );
}
