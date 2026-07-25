import { geoNaturalEarth1, geoPath } from "d3-geo";
import iso from "iso-3166-1";
import { useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { ProfileStats } from "../../api/types";
import { chart, limeRamp } from "./theme";

const WIDTH = 960;
const HEIGHT = 480;

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string }> & {
  id?: string | number;
};

const topology = world as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>;
}>;
const countries = feature(topology, topology.objects.countries)
  .features as CountryFeature[];

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], {
  type: "FeatureCollection",
  features: countries,
});
const path = geoPath(projection);

/** Films per country, on a world map (sequential single-hue ramp). */
export function CountryMap({
  data,
  totalFilms,
}: {
  data: ProfileStats["countries"];
  totalFilms?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    name: string;
    count: number;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);

  function handleMove(
    event: React.MouseEvent,
    name: string,
    count: number | undefined,
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    setHover({
      name,
      count: count ?? 0,
      x,
      y: event.clientY - rect.top,
      flip: x > rect.width * 0.7,
    });
  }

  function shareLabel(count: number): string | null {
    if (!totalFilms || count === 0) return null;
    const share = (count / totalFilms) * 100;
    return share < 1 ? "<1%" : `${Math.round(share)}%`;
  }

  // alpha-2 (backend) -> numeric id (world-atlas topology)
  const countsByNumeric = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { country, count } of data) {
      const numeric = iso.whereAlpha2(country)?.numeric;
      if (numeric) counts.set(numeric, count);
    }
    return counts;
  }, [data]);

  const max = Math.max(1, ...data.map((d) => d.count));

  function fillFor(count: number | undefined): string {
    if (!count) return chart.landBase;
    const step = Math.min(
      limeRamp.length - 1,
      Math.floor((Math.log(count + 1) / Math.log(max + 1)) * limeRamp.length),
    );
    return limeRamp[step];
  }

  return (
    <figure aria-label="films by country of production">
      <div ref={containerRef} className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" className="w-full">
          {countries.map((c) => {
            const id = String(c.id).padStart(3, "0");
            const count = countsByNumeric.get(id);
            return (
              <path
                key={id}
                d={path(c) ?? undefined}
                fill={fillFor(count)}
                stroke={chart.surface}
                strokeWidth={0.5}
                onMouseMove={(e) => handleMove(e, c.properties.name, count)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-night-border
                     bg-night-soft px-3 py-2 text-xs shadow-lg"
            style={{
              top: hover.y + 14,
              ...(hover.flip
                ? { right: `calc(100% - ${hover.x - 12}px)` }
                : { left: hover.x + 12 }),
            }}
          >
            <div className="font-semibold text-snow">{hover.name}</div>
            <div className="mt-0.5 text-fog">
              {hover.count} film{hover.count === 1 ? "" : "s"}
              {shareLabel(hover.count) &&
                ` · ${shareLabel(hover.count)} of your films`}
            </div>
          </div>
        )}
      </div>
      <figcaption className="mt-2 flex items-center justify-between text-xs text-fog">
        <span aria-live="polite" className="sr-only">
          {hover
            ? `${hover.name}: ${hover.count} film${hover.count === 1 ? "" : "s"}`
            : " "}
        </span>
        <span className="flex items-center gap-1">
          none
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: chart.landBase }}
          />
          fewer
          {limeRamp.map((color) => (
            <span
              key={color}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          more
        </span>
      </figcaption>
    </figure>
  );
}
