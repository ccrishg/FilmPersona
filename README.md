# FilmPersona 🎬

**Turn your Letterboxd history into a film personality profile.**

Type your Letterboxd username → FilmPersona scrapes your public history, enriches
every film with TMDB metadata, and computes your film personality: a 4-letter
type, one of 16 named archetypes, a world map of your cinema, your dominant
genres, and how your ratings compare to the crowd.

> Data Engineering portfolio project — the point is a clean, testable,
> asynchronous ETL pipeline (ingest → enrich → analyze → serve), not a
> black-box model. The pipeline and the personality model are explained
> visually at `/how-it-works` once the app is running.

## Quickstart

Prerequisites: [uv](https://docs.astral.sh/uv/), [just](https://github.com/casey/just)
(`uv tool install rust-just`), Node ≥ 20, Docker Desktop, a free
[TMDB API key](https://www.themoviedb.org/settings/api).

```bash
cp backend/.env.example backend/.env    # add your TMDB_API_KEY
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
just dev                                # Redis + API + Celery worker + frontend
```

Open http://localhost:5173 and type a Letterboxd username.

```bash
just ci             # lint + backend tests + frontend tests — exactly what CI runs
just test           # pytest
just test-frontend  # vitest
just e2e            # Playwright: full user flow against a mocked API
just fmt            # ruff + prettier autoformat
just migrate "msg"  # new Alembic migration
```

## Stack

React 19 · TypeScript · Vite · Tailwind 4 · Recharts · d3-geo — FastAPI ·
SQLAlchemy 2 · Alembic · Celery · Redis · httpx + BeautifulSoup — uv · just ·
pytest · vitest · Playwright · GitHub Actions.

## A few design decisions

- **Scraping + RSS, not an official API** — Letterboxd's API is invite-only.
  The scraper is isolated behind a normalized contract, rate-limited, and
  fixture-tested; a CSV export upload covers private profiles.
- **Rules + scoring, not ML, for v1** — with one user's history there's
  nothing to cluster. A deterministic, explainable scorer ships value now,
  and the feature set it computes is the future training set once enough
  profiles exist.
- **Celery + Redis** — a scrape+enrich of a large history takes minutes; the
  queue buys progress reporting and retries without holding an HTTP request open.
- **SQLite** — zero-ops for a portfolio deployment; every query goes through
  SQLAlchemy, so a swap to Postgres is a `DATABASE_URL` change.

---

*This product uses the TMDB API but is not endorsed or certified by TMDB. Not
affiliated with Letterboxd.*
