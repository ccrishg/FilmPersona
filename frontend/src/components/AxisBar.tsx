import type { Axis } from "../api/types";

const emphasisClass =
  "font-semibold text-snow underline decoration-lime decoration-2 underline-offset-4";

/**
 * One personality axis: two poles and a 0-100 score toward the high pole.
 *
 * `revealed` (default true) gates the winning-pole emphasis (bold + underline)
 * independently of the marker position — the /how-it-works demo animates the
 * marker to its score first, then flips `revealed` to true to "call" the winner.
 */
export function AxisBar({
  axis,
  chips = [],
  revealed = true,
}: {
  axis: Axis;
  chips?: string[];
  revealed?: boolean;
}) {
  const towardHigh = axis.score >= 50;
  return (
    <div aria-label={`${axis.label}: ${axis.score} toward ${axis.high.name}`}>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className={revealed && !towardHigh ? emphasisClass : "text-fog"}>
          {axis.low.name}
        </span>
        <span className="text-xs uppercase tracking-wide text-fog">
          {axis.label}
        </span>
        <span className={revealed && towardHigh ? emphasisClass : "text-fog"}>
          {axis.high.name}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-night" role="presentation">
        {/* midpoint tick */}
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-night-border" />
        {/* score marker */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full
                     border-2 border-night bg-lime transition-[left] duration-700 ease-out"
          style={{ left: `${axis.score}%` }}
          data-testid={`axis-marker-${axis.key}`}
        />
      </div>

      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" title={axis.explanation}>
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-night px-2.5 py-0.5 text-xs text-fog"
            >
              {chip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
