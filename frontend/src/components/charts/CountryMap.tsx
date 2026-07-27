import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { ProfileStats } from "../../api/types";
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

const WIDTH = 960;
const HEIGHT = 480;

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], {
  type: "FeatureCollection",
  features: worldCountries,
});
const path = geoPath(projection);

/** Films per country, on a flat world map (sequential single-hue ramp). */
export function CountryMap({
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

  const counts = countsByNumericId(data);
  const fillFor = countryFillScale(data);

  return (
    <figure aria-label="films by country of production">
      <div ref={containerRef} className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" className="w-full">
          {worldCountries.map((c) => {
            const id = countryId(c);
            const count = counts.get(id);
            return (
              <path
                key={id}
                d={path(c) ?? undefined}
                fill={fillFor(count)}
                stroke="none"
                onMouseMove={(e) =>
                  handleMove(e, { name: c.properties.name, count: count ?? 0 })
                }
                onMouseLeave={clear}
              />
            );
          })}
          <path
            d={path(countryBorders) ?? undefined}
            fill="none"
            stroke={chart.surface}
            strokeWidth={0.5}
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
      <figcaption className="mt-2 flex items-center justify-between text-xs text-fog">
        <span aria-live="polite" className="sr-only">
          {hover
            ? `${hover.name}: ${hover.count} film${hover.count === 1 ? "" : "s"}`
            : " "}
        </span>
        <span className="flex items-center gap-1">
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
        </span>
      </figcaption>
    </figure>
  );
}
