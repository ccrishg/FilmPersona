import { geoNaturalEarth1, geoPath } from "d3-geo";
import iso from "iso-3166-1";
import { useMemo, useState } from "react";
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
export function CountryMap({ data }: { data: ProfileStats["countries"] }) {
  const [hover, setHover] = useState<{ name: string; count: number } | null>(
    null,
  );

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
    if (!count) return chart.surfaceSoft;
    const step = Math.min(
      limeRamp.length - 1,
      Math.floor((Math.log(count + 1) / Math.log(max + 1)) * limeRamp.length),
    );
    return limeRamp[step];
  }

  return (
    <figure aria-label="films by country of production">
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
              onMouseEnter={() =>
                setHover({ name: c.properties.name, count: count ?? 0 })
              }
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <figcaption className="mt-2 flex items-center justify-between text-xs text-fog">
        <span aria-live="polite">
          {hover
            ? `${hover.name}: ${hover.count} film${hover.count === 1 ? "" : "s"}`
            : " "}
        </span>
        <span className="flex items-center gap-1">
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
