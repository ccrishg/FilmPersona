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
            label={{
              value: "TMDB popularity (log)",
              position: "insideBottom",
              offset: -4,
              fill: chart.inkMuted,
              fontSize: 11,
            }}
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
                    you: ★{p.user_rating} · crowd: {p.vote_average ?? "—"}/10
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            fill={chart.seriesAmber}
            fillOpacity={0.75}
            name="Films"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
