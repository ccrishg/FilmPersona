// d3-geo-projection ships no type declarations and there's no @types package.
// We only use geoStitch (re-joins antimeridian-cut polygons before projecting).
declare module "d3-geo-projection" {
  export function geoStitch<T>(object: T): T;
}
