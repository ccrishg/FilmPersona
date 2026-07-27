import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-night-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Film<span className="text-lime">Persona</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-fog sm:inline">
              Your Letterboxd history, decoded
            </span>
            <nav aria-label="secondary" className="flex items-center gap-2">
              <Link
                to="/how-it-works"
                className="rounded-full border border-night-border px-3 py-1 text-xs
                           font-semibold text-snow transition-colors hover:border-lime
                           hover:text-lime"
              >
                How it works
              </Link>
              <span
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-default items-center gap-1.5 rounded-full
                           border border-night-border px-3 py-1 text-xs font-semibold
                           text-fog/60"
              >
                Recommendations
                <span className="rounded-full bg-night px-1.5 py-0.5 text-[10px] font-medium text-fog">
                  Soon
                </span>
              </span>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-night-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 text-xs text-fog">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB. Not affiliated with Letterboxd.
        </div>
      </footer>
    </div>
  );
}
