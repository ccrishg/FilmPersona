import redis
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db

router = APIRouter()


@router.get("/health")
def health(response: Response, db: Session = Depends(get_db)) -> dict:
    """Liveness check for DB and Redis — used by deploy platforms for rollback."""
    checks = {"database": False, "redis": False}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    try:
        client = redis.Redis.from_url(get_settings().redis_url, socket_connect_timeout=2)
        checks["redis"] = bool(client.ping())
    except Exception:
        pass

    healthy = all(checks.values())
    response.status_code = 200 if healthy else 503
    return {"status": "ok" if healthy else "degraded", "checks": checks}
