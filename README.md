# FilmPersona

Turn your Letterboxd history into a film personality profile.

> 🚧 Work in progress — full documentation (architecture diagram, design decisions) lands with v1.

## Quickstart

Prerequisites: [uv](https://docs.astral.sh/uv/), [just](https://github.com/casey/just), Node ≥ 20, Docker Desktop, a [TMDB API key](https://www.themoviedb.org/settings/api).

```bash
cp backend/.env.example backend/.env   # add your TMDB_API_KEY
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
just dev                               # Redis + API + worker + frontend
```

## Development

```bash
just ci             # lint + backend tests + frontend tests (same as CI)
just fmt            # auto-format backend and frontend
just e2e            # Playwright end-to-end test
```
