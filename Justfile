# FilmPersona task runner — same commands locally and in CI.

# Start Redis, API, Celery worker and frontend dev server (Ctrl-C stops all)
dev:
    docker compose up -d redis
    cd backend && uv run alembic upgrade head
    npx concurrently -k -n api,worker,web \
        "cd backend && uv run uvicorn app.main:app --reload --port 8000" \
        "cd backend && uv run celery -A app.worker worker --loglevel=info" \
        "cd frontend && npm run dev"

# Lint backend (ruff check + format check) and frontend (oxlint + prettier)
lint:
    cd backend && uv run ruff check . && uv run ruff format --check .
    cd frontend && npm run lint

# Auto-format everything
fmt:
    cd backend && uv run ruff check --fix . && uv run ruff format .
    cd frontend && npm run format

# Backend tests
test:
    cd backend && uv run pytest

# Frontend unit tests
test-frontend:
    cd frontend && npm run test

# End-to-end test of the critical flow (requires playwright browsers installed)
e2e:
    cd frontend && npx playwright test

# Everything CI runs — use before committing
ci: lint test test-frontend

# Create a new Alembic migration: just migrate "message"
migrate message:
    cd backend && uv run alembic revision --autogenerate -m "{{message}}"

# Apply migrations
db-upgrade:
    cd backend && uv run alembic upgrade head
