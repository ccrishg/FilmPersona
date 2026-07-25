import type { Personality } from "../api/types";
import { AxisBar } from "./AxisBar";

export function PersonalityCard({ personality }: { personality: Personality }) {
  const { code, archetype, axes } = personality;
  return (
    <section
      className="rounded-2xl border border-night-border bg-night-soft p-8"
      aria-label="personality"
    >
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div
          className="rounded-xl bg-night px-5 py-4 font-mono text-4xl font-bold
                     tracking-[0.3em] text-lime"
          aria-label={`personality code ${code}`}
        >
          {code}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{archetype.name}</h1>
          <p className="mt-1 text-lg text-sky">{archetype.tagline}</p>
        </div>
      </div>
      <p className="mt-6 max-w-3xl text-fog">{archetype.description}</p>

      <div className="mt-8 space-y-6">
        {axes.map((axis) => (
          <AxisBar key={axis.key} axis={axis} />
        ))}
      </div>
    </section>
  );
}
