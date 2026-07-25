import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAnalysis } from "../api/client";
import type { ProfileResult } from "../api/types";
import { PersonalityCard } from "../components/PersonalityCard";
import { CountryMap } from "../components/charts/CountryMap";
import { GenreChart } from "../components/charts/GenreChart";
import { RatingScatter } from "../components/charts/RatingScatter";
import { TimelineChart } from "../components/charts/TimelineChart";

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAnalysis(id)
      .then((analysis) => {
        if (analysis.status === "done" && analysis.result) {
          setResult(analysis.result);
          setUsername(analysis.username);
        } else if (analysis.status === "failed") {
          setError("This analysis failed.");
        } else {
          navigate(`/analysis/${id}`, { replace: true }); // still running
        }
      })
      .catch(() => setError("We couldn't find that profile."));
  }, [id, navigate]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl text-amber">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sky hover:underline">
          ← Analyze a profile
        </Link>
      </div>
    );
  }

  if (!result) {
    return <p className="py-16 text-center text-fog">Loading your profile…</p>;
  }

  const { personality, stats } = result;

  return (
    <div className="space-y-8">
      {username && <p className="text-fog">@{username}</p>}

      <PersonalityCard personality={personality} features={result.features} />

      <section
        aria-label="totals"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <StatTile label="Films" value={stats.totals.films} />
        <StatTile
          label="Hours watched"
          value={stats.totals.hours_watched ?? "—"}
        />
        <StatTile label="Countries" value={stats.countries.length} />
        <StatTile
          label="Your avg vs crowd"
          value={
            stats.totals.avg_user_rating != null &&
            stats.totals.avg_crowd_rating != null
              ? `★${stats.totals.avg_user_rating.toFixed(1)} vs ★${(
                  stats.totals.avg_crowd_rating / 2
                ).toFixed(1)}`
              : "—"
          }
        />
      </section>

      <Panel title="Where your films come from">
        <CountryMap data={stats.countries} totalFilms={stats.totals.films} />
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Your genres">
          <GenreChart genres={stats.genres} />
        </Panel>
        <Panel
          title="You vs the crowd"
          subtitle="Each dot is a film you rated. Left–right: how popular it is worldwide.
            Up–down: your rating. Top-left dots are hidden gems you loved;
            bottom-right, big hits that left you cold."
        >
          <RatingScatter points={stats.rating_vs_popularity} />
        </Panel>
      </div>

      {stats.timeline.length > 1 && (
        <Panel title="Your watching rhythm">
          <TimelineChart timeline={stats.timeline} />
        </Panel>
      )}

      {stats.favorites.length > 0 && (
        <Panel title="Your favorites">
          <ul className="flex flex-wrap gap-2">
            {stats.favorites.map((fav) => (
              <li
                key={`${fav.title}-${fav.year}`}
                className="rounded-full border border-night-border bg-night-soft px-4 py-1.5
                           text-sm text-snow"
              >
                {fav.title} {fav.year ? `(${fav.year})` : ""}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-night-border bg-night-soft p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-fog">
        {label}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-night-border bg-night-soft p-6">
      <h2
        className={
          subtitle ? "mb-1 text-lg font-semibold" : "mb-4 text-lg font-semibold"
        }
      >
        {title}
      </h2>
      {subtitle && <p className="mb-4 text-sm text-fog">{subtitle}</p>}
      {children}
    </section>
  );
}
