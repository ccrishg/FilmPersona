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
import { useFirstVisible } from "../../hooks/useFirstVisible";
import { chart, tooltipStyle } from "./theme";

/** The shape of your taste: top genres on a radar, grown in from the center on scroll. */
export function GenreChart({ genres }: { genres: ProfileStats["genres"] }) {
  const data = genres.slice(0, 8);
  const { ref, visible, instant } = useFirstVisible<HTMLDivElement>();

  return (
    <div ref={ref} className="h-72">
      {visible && (
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
              isAnimationActive={!instant}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
