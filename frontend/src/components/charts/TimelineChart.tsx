import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfileStats } from "../../api/types";
import { chart, tooltipStyle } from "./theme";

export function TimelineChart({
  timeline,
}: {
  timeline: ProfileStats["timeline"];
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <AreaChart data={timeline} margin={{ left: -16, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="timeline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={chart.seriesBlue}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={chart.seriesBlue}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={chart.grid}
            strokeDasharray="2 4"
          />
          <XAxis
            dataKey="month"
            stroke={chart.inkMuted}
            fontSize={12}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            stroke={chart.inkMuted}
            fontSize={12}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value} films`, ""]}
            labelStyle={{ color: chart.inkMuted }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={chart.seriesBlue}
            strokeWidth={2}
            fill="url(#timeline-fill)"
            name="Films watched"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
