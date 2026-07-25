import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-night-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Film<span className="text-lime">Persona</span>
          </Link>
          <span className="text-sm text-fog">
            Your Letterboxd history, decoded
          </span>
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
