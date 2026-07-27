import { useMemo, useRef, useState } from "react";
import { chart, limeRamp } from "./theme";

const CELL = 11;
const GAP = 3;
const COL = CELL + GAP;
const LABEL_COL = 28;
const MAX_WEEKS = 53;
const WEEKDAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" };
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Cell = { date: Date; count: number };

function fillFor(count: number): string {
  if (count === 0) return chart.landBase;
  return limeRamp[Math.min(count, limeRamp.length) - 1];
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** GitHub-contributions-style calendar: one square per day, colored by watch count. */
export function DailyHeatmap({
  daily,
}: {
  daily: { date: string; count: number }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    cell: Cell;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const counts = new Map(daily.map((d) => [d.date, d.count]));
    const timestamps = daily.map((d) => parseLocalDate(d.date).getTime());
    let start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));

    // Cap the window to the most recent MAX_WEEKS weeks.
    const capStart = new Date(end);
    capStart.setDate(capStart.getDate() - (MAX_WEEKS * 7 - 1));
    if (start < capStart) start = capStart;

    // Align to full weeks, Sunday-first (GitHub convention).
    start = new Date(start);
    start.setDate(start.getDate() - start.getDay());
    const alignedEnd = new Date(end);
    alignedEnd.setDate(alignedEnd.getDate() + (6 - alignedEnd.getDay()));

    const weeks: Cell[][] = [];
    const cursor = new Date(start);
    while (cursor <= alignedEnd) {
      const week: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({
          date: new Date(cursor),
          count: counts.get(toISODate(cursor)) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const monthLabels = weeks
      .map((week, i) => {
        const firstOfMonth = week.find((c) => c.date.getDate() === 1);
        return firstOfMonth
          ? { weekIndex: i, label: MONTH_NAMES[firstOfMonth.date.getMonth()] }
          : null;
      })
      .filter(
        (label): label is { weekIndex: number; label: string } =>
          label !== null,
      );

    return { weeks, monthLabels };
  }, [daily]);

  if (weeks.length === 0) return null;

  function handleMove(event: React.MouseEvent, cell: Cell) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    setHover({
      cell,
      x,
      y: event.clientY - rect.top,
      flip: x > rect.width * 0.7,
    });
  }

  const gridColumns = `${LABEL_COL}px repeat(${weeks.length}, ${COL}px)`;

  return (
    <figure aria-label="daily watching activity">
      <div className="overflow-x-auto">
        <div ref={containerRef} className="relative inline-block">
          <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
            <div />
            {weeks.map((_, i) => (
              <div key={i} className="text-[10px] text-fog">
                {monthLabels.find((m) => m.weekIndex === i)?.label ?? ""}
              </div>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div
              key={dow}
              className="grid items-center"
              style={{ gridTemplateColumns: gridColumns }}
            >
              <div className="text-[10px] text-fog">
                {WEEKDAY_LABELS[dow] ?? ""}
              </div>
              {weeks.map((week, wi) => {
                const cell = week[dow];
                return (
                  <div
                    key={wi}
                    onMouseMove={(e) => handleMove(e, cell)}
                    onMouseLeave={() => setHover(null)}
                    className="rounded-sm"
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: fillFor(cell.count),
                    }}
                  />
                );
              })}
            </div>
          ))}
          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-night-border
                         bg-night-soft px-3 py-2 text-xs shadow-lg"
              style={{
                top: hover.y + 14,
                ...(hover.flip
                  ? { right: `calc(100% - ${hover.x - 12}px)` }
                  : { left: hover.x + 12 }),
              }}
            >
              <div className="font-semibold text-snow">
                {hover.cell.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="mt-0.5 text-fog">
                {hover.cell.count} film{hover.cell.count === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 flex items-center justify-between text-xs text-fog">
        <span aria-live="polite" className="sr-only">
          {hover
            ? `${toISODate(hover.cell.date)}: ${hover.cell.count} film${
                hover.cell.count === 1 ? "" : "s"
              }`
            : " "}
        </span>
        <span className="flex items-center gap-1">
          <span>fewer</span>
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: chart.landBase }}
          />
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
