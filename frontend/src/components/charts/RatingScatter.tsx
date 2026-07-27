import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfileStats } from "../../api/types";
import { chart, tooltipStyle } from "./theme";

type Point = ProfileStats["rating_vs_popularity"][number];

/** SVG path for a 4-pointed sparkle star centered at (cx, cy). */
function starPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
): string {
  const spikes = 4;
  const step = Math.PI / spikes;
  let d = "";
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += `${i === 0 ? "M" : "L"}${x},${y} `;
  }
  return `${d}Z`;
}

/** Each film is a twinkling star — position is static, only the glow animates. */
function StarShape({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  // Deterministic per-point delay from position, so stars don't twinkle in sync.
  const delay = Math.round(cx * 31 + cy * 17) % 2400;
  return (
    <path
      d={starPath(cx, cy, 7, 2.5)}
      fill={chart.seriesAmber}
      className="twinkle"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

/** Your rating vs how popular the film is — mainstream taste shows up bottom-right. */
export function RatingScatter({
  points,
}: {
  points: ProfileStats["rating_vs_popularity"];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <ScatterChart margin={{ left: -8, right: 16, top: 8 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" />
          <XAxis
            dataKey="popularity"
            name="TMDB popularity"
            type="number"
            scale="log"
            domain={["auto", "auto"]}
            stroke={chart.inkMuted}
            fontSize={12}
            tickFormatter={(v: number) =>
              String(v >= 10 ? Math.round(v) : Math.round(v * 10) / 10)
            }
          />
          <YAxis
            dataKey="user_rating"
            name="Your rating"
            type="number"
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            stroke={chart.inkMuted}
            fontSize={12}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ strokeDasharray: "3 3", stroke: chart.inkMuted }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as Point | undefined;
              if (!p) return null;
              return (
                <div style={{ ...tooltipStyle, padding: "6px 10px" }}>
                  <div className="font-semibold">
                    {p.title} {p.year ? `(${p.year})` : ""}
                  </div>
                  <div style={{ color: chart.inkMuted }}>
                    you: ★{p.user_rating} · crowd:{" "}
                    {p.vote_average != null
                      ? `★${(p.vote_average / 2).toFixed(1)}`
                      : "—"}
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={points} shape={StarShape} name="Films" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
