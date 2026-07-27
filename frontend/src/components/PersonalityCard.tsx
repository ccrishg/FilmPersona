import { useEffect, useState } from "react";
import type { Personality, ProfileFeatures } from "../api/types";
import { useFirstVisible } from "../hooks/useFirstVisible";
import { AxisBar } from "./AxisBar";

const NEUTRAL_SCORE = 50;
const STAGGER_MS = 200;

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** One or two headline numbers per axis; the narrative stays in How it works. */
function chipsFor(key: string, f?: ProfileFeatures): string[] {
  if (!f) return [];
  const chips: string[] = [];
  switch (key) {
    case "popularity":
      if (f.median_popularity != null)
        chips.push(`median popularity ${Math.round(f.median_popularity)}`);
      if (f.pct_high_popularity != null)
        chips.push(`${pct(f.pct_high_popularity)} blockbusters`);
      break;
    case "scope":
      if (f.pct_non_english != null)
        chips.push(`${pct(f.pct_non_english)} non-English`);
      break;
    case "habit":
      if (f.genre_diversity != null)
        chips.push(`${pct(f.genre_diversity)} genre spread`);
      if (f.pct_rewatch != null) chips.push(`${pct(f.pct_rewatch)} rewatches`);
      break;
    case "judgment":
      // rating_delta is on the 10-point TMDB scale; show it in stars (/5).
      if (f.rating_delta != null) {
        const stars = f.rating_delta / 2;
        chips.push(`${stars >= 0 ? "+" : ""}${stars.toFixed(1)}★ vs crowd`);
      }
      break;
  }
  return chips;
}

export function PersonalityCard({
  personality,
  features,
}: {
  personality: Personality;
  features?: ProfileFeatures;
}) {
  const { code, archetype, axes } = personality;
  const { ref, visible, instant } = useFirstVisible<HTMLElement>();
  const [settledCount, setSettledCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (instant) {
      setSettledCount(axes.length);
      return;
    }
    if (settledCount >= axes.length) return;
    const timer = setTimeout(() => setSettledCount((c) => c + 1), STAGGER_MS);
    return () => clearTimeout(timer);
  }, [visible, instant, settledCount, axes.length]);

  return (
    <section
      ref={ref}
      className="rounded-2xl border border-night-border bg-night-soft p-8"
      aria-label="personality"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">{archetype.name}</h1>
            <span
              className="rounded-full bg-night px-3 py-1 font-mono text-sm tracking-widest text-lime"
              aria-label={`personality code ${code}`}
            >
              #{code}
            </span>
          </div>
          <p className="mt-2 text-xl text-sky">{archetype.tagline}</p>
          <p className="mt-4 text-fog">{archetype.description}</p>
        </div>

        <div className="space-y-5">
          {axes.map((axis, i) => {
            const revealed = i < settledCount;
            return (
              <AxisBar
                key={axis.key}
                axis={revealed ? axis : { ...axis, score: NEUTRAL_SCORE }}
                chips={chipsFor(axis.key, features)}
                revealed={revealed}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
