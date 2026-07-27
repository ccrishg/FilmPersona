import { geoStitch } from "d3-geo-projection";
import iso from "iso-3166-1";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { ProfileStats } from "../../api/types";
import { chart, limeRamp } from "./theme";

export type CountryFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { name: string }
> & {
  id?: string | number;
};

const topology = world as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>;
}>;

// world-atlas polygons are cut at the antimeridian (Russia, Fiji...); under an
// orthographic (globe) projection those cuts render as visible seam artifacts
// as it rotates. geoStitch re-joins them into continuous rings before we draw.
const stitched = geoStitch(feature(topology, topology.objects.countries));

/** Every country polygon in the world-atlas 110m topology (antimeridian-stitched). */
export const worldCountries = stitched.features as CountryFeature[];

/** Interior country borders as a single MultiLineString (cheaper than per-country strokes). */
export const countryBorders = mesh(
  topology,
  topology.objects.countries,
  (a, b) => a !== b,
);

export function countryId(feature: CountryFeature): string {
  return String(feature.id).padStart(3, "0");
}

/** ISO 3166-1 alpha-2 (backend) -> numeric id (world-atlas topology). */
export function countsByNumericId(
  data: ProfileStats["countries"],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { country, count } of data) {
    const numeric = iso.whereAlpha2(country)?.numeric;
    if (numeric) counts.set(numeric, count);
  }
  return counts;
}

/** Sequential lime fill for a country, log-scaled against the max in the dataset. */
export function countryFillScale(data: ProfileStats["countries"]) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (count: number | undefined): string => {
    if (!count) return chart.landBase;
    const step = Math.min(
      limeRamp.length - 1,
      Math.floor((Math.log(count + 1) / Math.log(max + 1)) * limeRamp.length),
    );
    return limeRamp[step];
  };
}

export function shareLabel(
  count: number,
  totalFilms: number | undefined,
): string | null {
  if (!totalFilms || count === 0) return null;
  const share = (count / totalFilms) * 100;
  return share < 1 ? "<1%" : `${Math.round(share)}%`;
}
