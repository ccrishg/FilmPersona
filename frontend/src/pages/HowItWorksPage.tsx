import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AxisBar } from "../components/AxisBar";
import { PersonalityCard } from "../components/PersonalityCard";
import { ARCHETYPES } from "../data/archetypes";
import {
  DEMO_AXES,
  DEMO_CHIPS,
  DEMO_FEATURES,
  DEMO_FILMS,
  DEMO_PERSONALITY,
} from "../data/demoDiet";

const NEUTRAL_SCORE = 50;
const STAGGER_MS = 800;

/**
 * Drives the "verdict" animation: each axis marker slides from a neutral
 * center to its real score, one at a time, once the Analyze stage scrolls
 * into view. Falls back to the final state instantly when IntersectionObserver
 * isn't available (jsdom in tests) or the user prefers reduced motion.
 */
function useDecisionSequence() {
  const [started, setStarted] = useState(false);
  const [settledCount, setSettledCount] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const replay = () => {
    setSettledCount(0);
    setStarted(true);
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (typeof IntersectionObserver === "undefined" || reduceMotion) {
      setSettledCount(DEMO_AXES.length);
      setStarted(true);
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          replay();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || settledCount >= DEMO_AXES.length) return;
    const timer = setTimeout(() => setSettledCount((c) => c + 1), STAGGER_MS);
    return () => clearTimeout(timer);
  }, [started, settledCount]);

  return { sectionRef, settledCount, replay };
}

export function HowItWorksPage() {
  const { sectionRef, settledCount, replay } = useDecisionSequence();
  const decided = settledCount === DEMO_AXES.length;
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    if (!decided) {
      setCardVisible(false);
      return;
    }
    const timer = setTimeout(() => setCardVisible(true), 30);
    return () => clearTimeout(timer);
  }, [decided]);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs uppercase tracking-wide text-fog">How it works</p>
        <h1 className="mt-1 text-2xl font-bold">
          From your history to your type
        </h1>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-sky/40 bg-sky/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky">
          Worked example
        </span>
        <p className="text-sm text-fog">
          Six sample films, not your profile —{" "}
          <Link to="/" className="text-sky hover:underline">
            run yours from the home page
          </Link>
          .
        </p>
      </div>

      <div className="relative mt-8">
        <div
          aria-hidden="true"
          className="absolute bottom-3 left-4 top-3 w-px bg-night-border"
        />
        <div className="space-y-10">
          <Stage
            index={1}
            label="Ingest"
            blurb="This is everything a Letterboxd profile actually publishes: title, year, your rating, rewatch and favorite flags."
          >
            <FilmGrid enriched={false} label="ingest films" />
          </Stage>

          <Stage
            index={2}
            label="Enrich"
            blurb="Each film is resolved against TMDB — and cached — for country, genre, language and popularity: data Letterboxd doesn't expose."
          >
            <FilmGrid enriched label="enrich films" />
          </Stage>

          <Stage
            index={3}
            label="Analyze"
            blurb="The enriched history collapses into four independent 0–100 scores. Watch each one settle and its winning trait get underlined."
            innerRef={sectionRef}
          >
            <div
              aria-label="axis scores"
              className="space-y-5 rounded-2xl border border-night-border bg-night-soft p-6"
            >
              {DEMO_AXES.map((axis, i) => {
                const revealed = i < settledCount;
                return (
                  <AxisBar
                    key={axis.key}
                    axis={revealed ? axis : { ...axis, score: NEUTRAL_SCORE }}
                    chips={revealed ? (DEMO_CHIPS[axis.key] ?? []) : []}
                    revealed={revealed}
                  />
                );
              })}
            </div>
          </Stage>

          <Stage
            index={4}
            label="Score"
            blurb="The four winning letters compose your code, which maps to one of 16 named archetypes."
          >
            <div className="flex items-center gap-4">
              <div className="flex gap-2" aria-label="assembled code">
                {DEMO_AXES.map((axis, i) => {
                  const revealed = i < settledCount;
                  return (
                    <span
                      key={axis.key}
                      className={
                        revealed
                          ? "flex h-11 w-11 items-center justify-center rounded-lg bg-night font-mono text-2xl font-bold text-lime transition-colors duration-300"
                          : "flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-night-border font-mono text-2xl font-bold text-fog"
                      }
                    >
                      {revealed ? axis.letter : "_"}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={replay}
                className="rounded-full border border-night-border px-3 py-1.5 text-xs
                           font-semibold text-fog transition-colors hover:border-lime hover:text-lime"
              >
                ↻ Replay
              </button>
            </div>

            {decided && (
              <div
                aria-label="resulting profile"
                className={
                  cardVisible
                    ? "mt-6 opacity-100 transition-opacity duration-500"
                    : "mt-6 opacity-0 transition-opacity duration-500"
                }
              >
                <PersonalityCard
                  personality={DEMO_PERSONALITY}
                  features={DEMO_FEATURES}
                />
              </div>
            )}
          </Stage>
        </div>
      </div>

      <details className="mt-10 rounded-xl border border-night-border bg-night-soft">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-snow">
          See all 16 types
        </summary>
        <div className="grid gap-px border-t border-night-border bg-night-border sm:grid-cols-2">
          {ARCHETYPES.map((a) => (
            <div key={a.code} className="bg-night-soft p-4">
              <p className="font-mono text-xs text-fog">{a.code}</p>
              <p className="mt-0.5 text-sm font-semibold text-snow">{a.name}</p>
              <p className="text-xs text-fog">{a.tagline}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Stage({
  index,
  label,
  blurb,
  innerRef,
  children,
}: {
  index: number;
  label: string;
  blurb: string;
  innerRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div ref={innerRef} className="relative flex gap-4">
      <div
        className="relative z-10 flex h-8 w-8 flex-none items-center justify-center
                   rounded-full border-2 border-night-border bg-night-soft font-mono
                   text-xs font-bold text-snow"
      >
        {index}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-lime">
          {label}
        </p>
        <p className="mt-0.5 max-w-xl text-sm text-fog">{blurb}</p>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function FilmGrid({ enriched, label }: { enriched: boolean; label: string }) {
  return (
    <div
      aria-label={label}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {DEMO_FILMS.map((film) => (
        <div
          key={film.title}
          className="rounded-xl border border-night-border bg-night-soft p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-snow">{film.title}</p>
              <p className="text-xs text-fog">{film.year}</p>
            </div>
            <span className="whitespace-nowrap font-mono text-sm text-amber">
              ★{film.rating.toFixed(1)}
            </span>
          </div>

          {(film.isFavorite || film.isRewatch) && (
            <div className="mt-2 flex gap-1.5">
              {film.isFavorite && (
                <span className="rounded-full bg-night px-2 py-0.5 text-[11px] text-lime">
                  favorite
                </span>
              )}
              {film.isRewatch && (
                <span className="rounded-full bg-night px-2 py-0.5 text-[11px] text-sky">
                  rewatch
                </span>
              )}
            </div>
          )}

          {enriched && (
            <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-night-border pt-3">
              {film.genres.slice(0, 2).map((genre) => (
                <li
                  key={genre}
                  className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] text-sky"
                >
                  {genre}
                </li>
              ))}
              <li className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] text-sky">
                {film.countries.join("/")}
              </li>
              <li className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] text-sky">
                {film.language}
              </li>
              <li className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] text-sky">
                pop {Math.round(film.popularity)}
              </li>
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
