// Shared chart tokens (mirrors the Tailwind theme in index.css).
export const chart = {
  surface: "#14181c",
  surfaceSoft: "#1d232a",
  grid: "#2c3440",
  landBase: "#39434f",
  ink: "#eef4fa",
  inkMuted: "#99aabb",
  seriesGreen: "#00e054",
  seriesBlue: "#40bcf4",
  seriesAmber: "#ffb400",
} as const;

export const tooltipStyle = {
  backgroundColor: chart.surfaceSoft,
  border: `1px solid ${chart.grid}`,
  borderRadius: 8,
  color: chart.ink,
  fontSize: 12,
} as const;

/** Sequential 5-step lime ramp on the dark surface (map fills, low -> high). */
export const limeRamp = [
  "#17321f",
  "#1a4a2c",
  "#1c683a",
  "#12a248",
  "#00e054",
] as const;
