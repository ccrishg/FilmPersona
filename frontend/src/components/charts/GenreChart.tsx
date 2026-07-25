import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ProfileStats } from "../../api/types";
import { chart, tooltipStyle } from "./theme";

/** The shape of your taste: top genres on a radar. */
export function GenreChart({ genres }: { genres: ProfileStats["genres"] }) {
  const data = genres.slice(0, 8);
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <RadarChart data={data} margin={{ top: 8, bottom: 8 }}>
          <PolarGrid stroke={chart.grid} />
          <PolarAngleAxis
            dataKey="genre"
            tick={{ fill: chart.inkMuted, fontSize: 12 }}
          />
          <PolarRadiusAxis tick={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value} films`, ""]}
          />
          <Radar
            dataKey="count"
            stroke={chart.seriesGreen}
            fill={chart.seriesGreen}
            fillOpacity={0.35}
            name="Films"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
