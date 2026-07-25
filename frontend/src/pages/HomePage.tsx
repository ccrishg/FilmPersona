import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, createAnalysis } from "../api/client";
import { UploadZone } from "../components/UploadZone";

const USERNAME_RE = /^[a-zA-Z0-9_]{2,30}$/;

export function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setError("That doesn't look like a Letterboxd username.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { id } = await createAnalysis(trimmed);
      navigate(`/analysis/${id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold leading-tight">
          What does your <span className="text-lime">watchlist</span> say about
          you?
        </h1>
        <p className="mt-4 text-lg text-fog">
          FilmPersona reads your public Letterboxd history and turns it into a
          film personality profile: your countries, your genres, your type.
        </p>
      </section>

      <form
        onSubmit={submit}
        className="flex gap-2"
        aria-label="analyze username"
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Letterboxd username"
          aria-label="Letterboxd username"
          className="flex-1 rounded-lg border border-night-border bg-night-soft px-4 py-3
                     text-snow placeholder:text-fog focus:border-lime focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-lime px-6 py-3 font-semibold text-night
                     hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Analyze"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber">
          {error}
        </p>
      )}

      <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-wide text-fog">
        <div className="h-px flex-1 bg-night-border" />
        private profile?
        <div className="h-px flex-1 bg-night-border" />
      </div>

      <UploadZone className="mt-6" />
    </div>
  );
}
