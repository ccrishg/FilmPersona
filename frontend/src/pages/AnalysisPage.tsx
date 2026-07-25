import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAnalysis } from "../api/client";
import type { Analysis, AnalysisStage } from "../api/types";
import { UploadZone } from "../components/UploadZone";

const POLL_MS = 2000;

const STAGES: { key: AnalysisStage; label: string }[] = [
  { key: "ingest", label: "Reading your Letterboxd history" },
  { key: "enrich", label: "Enriching films with TMDB metadata" },
  { key: "analyze", label: "Computing your film personality" },
];

const ERROR_MESSAGES: Record<string, string> = {
  PROFILE_NOT_FOUND:
    "We couldn't find that Letterboxd profile. Check the username?",
  PROFILE_PRIVATE:
    "That profile is private, so we can't read it from the outside.",
  SCRAPE_BLOCKED:
    "Letterboxd blocked our automated request before we could finish.",
  EMPTY_HISTORY: "That profile has no watched films yet — nothing to analyze.",
  INVALID_EXPORT: "That file doesn't look like a Letterboxd export ZIP.",
  INTERNAL_ERROR: "Something broke on our side. Please try again in a minute.",
};

const OFFERS_ZIP_FALLBACK = new Set(["PROFILE_PRIVATE", "SCRAPE_BLOCKED"]);

function stageIndex(stage: AnalysisStage | null): number {
  return stage ? STAGES.findIndex((s) => s.key === stage) : -1;
}

export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    if (!id) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getAnalysis(id!);
        if (cancelled) return;
        setAnalysis(data);
        if (data.status === "done") {
          navigate(`/profile/${id}`, { replace: true });
          return;
        }
        if (data.status !== "failed") timer = setTimeout(poll, POLL_MS);
      } catch {
        if (!cancelled) setLost(true);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, navigate]);

  if (lost) {
    return (
      <ErrorPanel message="We lost track of that analysis.">
        <BackHome />
      </ErrorPanel>
    );
  }

  if (analysis?.status === "failed") {
    const code = analysis.error_code ?? "INTERNAL_ERROR";
    return (
      <ErrorPanel
        message={ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR}
      >
        {OFFERS_ZIP_FALLBACK.has(code) ? (
          <>
            <p className="text-fog">
              You can still get your profile: export your data from Letterboxd
              and upload the ZIP here.
            </p>
            <UploadZone className="mt-4" />
          </>
        ) : (
          <BackHome />
        )}
      </ErrorPanel>
    );
  }

  const current = stageIndex(analysis?.stage ?? null);

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-bold">
        Analyzing{analysis?.username ? ` @${analysis.username}` : ""}…
      </h1>
      <ol className="mt-8 space-y-4" aria-label="analysis progress">
        {STAGES.map((stage, i) => {
          const state =
            i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li key={stage.key} className="flex items-center gap-3">
              <span
                className={
                  state === "done"
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-lime text-xs font-bold text-night"
                    : state === "active"
                      ? "h-6 w-6 animate-pulse rounded-full border-2 border-lime"
                      : "h-6 w-6 rounded-full border-2 border-night-border"
                }
              >
                {state === "done" ? "✓" : ""}
              </span>
              <span className={state === "pending" ? "text-fog" : ""}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-sm text-fog">
        Big histories take a minute or two — we scrape politely and TMDB has
        manners too.
      </p>
    </div>
  );
}

function ErrorPanel({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-bold text-amber">{message}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function BackHome() {
  return (
    <Link to="/" className="text-sky hover:underline">
      ← Try another username
    </Link>
  );
}
