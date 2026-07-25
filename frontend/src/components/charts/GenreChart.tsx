import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfileStats } from "../../api/types";
import { chart, tooltipStyle } from "./theme";

export function GenreChart({ genres }: { genres: ProfileStats["genres"] }) {
  const data = genres.slice(0, 10);
  return (
    <div style={{ height: 40 * data.length + 40 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid
            horizontal={false}
            stroke={chart.grid}
            strokeDasharray="2 4"
          />
          <XAxis
            type="number"
            stroke={chart.inkMuted}
            fontSize={12}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="genre"
            width={100}
            stroke={chart.inkMuted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: chart.surfaceSoft }}
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value} films`, ""]}
          />
          <Bar
            dataKey="count"
            fill={chart.seriesGreen}
            radius={[0, 4, 4, 0]}
            barSize={16}
            name="Films"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
