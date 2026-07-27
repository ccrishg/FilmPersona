import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { useEffect, useRef, useState } from "react";
import type { ProfileStats } from "../../api/types";
import { prefersReducedMotion } from "../../lib/motion";
import { FloatingTooltip, useFloatingTooltip } from "./FloatingTooltip";
import {
  countryBorders,
  countryFillScale,
  countryId,
  countsByNumericId,
  shareLabel,
  worldCountries,
} from "./geo";
import { chart, limeRamp } from "./theme";

const SIZE = 480;
const ROTATION_DEG_PER_SEC = 10; // one full turn every 36s
const START_LONGITUDE = -20;
const START_LATITUDE = -18;

const graticule = geoGraticule10();
const sphere = { type: "Sphere" as const };

/** Films per country, on a slowly auto-rotating globe (pauses on hover). */
export function GlobeMap({
  data,
  totalFilms,
}: {
  data: ProfileStats["countries"];
  totalFilms?: number;
}) {
  const { containerRef, hover, handleMove, clear } = useFloatingTooltip<{
    name: string;
    count: number;
  }>();
  const [longitude, setLongitude] = useState(START_LONGITUDE);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf: number;
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        setLongitude((lon) => lon + (ROTATION_DEG_PER_SEC * dt) / 1000);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const projection = geoOrthographic()
    .fitSize([SIZE, SIZE], sphere)
    .rotate([longitude, START_LATITUDE]);
  const path = geoPath(projection);

  const counts = countsByNumericId(data);
  const fillFor = countryFillScale(data);

  return (
    <figure aria-label="films by country of production, on a globe">
      <div
        ref={containerRef}
        className="relative mx-auto max-w-md"
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
          clear();
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" className="w-full">
          <path
            d={path(sphere) ?? undefined}
            fill={chart.surfaceSoft}
            stroke={chart.grid}
            strokeWidth={1}
          />
          <path
            d={path(graticule) ?? undefined}
            fill="none"
            stroke={chart.grid}
            strokeOpacity={0.35}
            strokeWidth={0.5}
          />
          {worldCountries.map((c) => {
            const d = path(c);
            if (!d) return null;
            const id = countryId(c);
            const count = counts.get(id);
            return (
              <path
                key={id}
                d={d}
                fill={fillFor(count)}
                stroke="none"
                onMouseMove={(e) =>
                  handleMove(e, { name: c.properties.name, count: count ?? 0 })
                }
              />
            );
          })}
          <path
            d={path(countryBorders) ?? undefined}
            fill="none"
            stroke={chart.surface}
            strokeWidth={0.4}
            strokeLinejoin="round"
          />
        </svg>
        {hover && (
          <FloatingTooltip x={hover.x} y={hover.y} flip={hover.flip}>
            <div className="font-semibold text-snow">{hover.name}</div>
            <div className="mt-0.5 text-fog">
              {hover.count} film{hover.count === 1 ? "" : "s"}
              {shareLabel(hover.count, totalFilms) &&
                ` · ${shareLabel(hover.count, totalFilms)} of your films`}
            </div>
          </FloatingTooltip>
        )}
      </div>
      <figcaption className="mt-2 flex items-center justify-center gap-1 text-xs text-fog">
        <span aria-live="polite" className="sr-only">
          {hover
            ? `${hover.name}: ${hover.count} film${hover.count === 1 ? "" : "s"}`
            : " "}
        </span>
        <span>none</span>
        <span
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: chart.landBase }}
        />
        <span>fewer</span>
        {limeRamp.map((color) => (
          <span
            key={color}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>more</span>
      </figcaption>
    </figure>
  );
}
