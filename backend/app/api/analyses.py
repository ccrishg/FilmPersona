import re
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.ingestion.csv_import import InvalidExportError, parse_export_zip
from app.models import Analysis, AnalysisSource, AnalysisStatus
from app.pipeline import entry_to_row

router = APIRouter(tags=["analyses"])

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{2,30}$")
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


class AnalysisCreate(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise ValueError("not a valid Letterboxd username")
        return value


class AnalysisAccepted(BaseModel):
    id: str
    status: AnalysisStatus


def _enqueue(analysis_id: str) -> None:
    from app.tasks import run_analysis  # local import: keeps API importable without a broker

    run_analysis.delay(analysis_id)


@router.post("/analyses", response_model=AnalysisAccepted, status_code=202)
def create_analysis(payload: AnalysisCreate, db: Session = Depends(get_db)) -> Any:
    settings = get_settings()

    # Scrape cache: reuse a fresh finished analysis of the same username (24h).
    fresh_cutoff = datetime.now(UTC) - timedelta(seconds=settings.cache_ttl_seconds)
    cached = db.scalar(
        select(Analysis)
        .where(
            Analysis.username == payload.username,
            Analysis.status == AnalysisStatus.DONE,
            Analysis.created_at >= fresh_cutoff,
        )
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    if cached is not None:
        return AnalysisAccepted(id=cached.id, status=cached.status)

    analysis = Analysis(source=AnalysisSource.SCRAPE, username=payload.username)
    db.add(analysis)
    db.commit()
    _enqueue(analysis.id)
    return AnalysisAccepted(id=analysis.id, status=analysis.status)


@router.post("/analyses/import", response_model=AnalysisAccepted, status_code=202)
async def import_export_zip(file: UploadFile, db: Session = Depends(get_db)) -> Any:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="export file too large")

    try:
        result = parse_export_zip(data)
    except InvalidExportError as exc:
        raise HTTPException(status_code=422, detail="not a valid Letterboxd export ZIP") from exc

    analysis = Analysis(source=AnalysisSource.CSV_IMPORT)
    db.add(analysis)
    db.flush()
    for entry in result.entries:
        db.add(entry_to_row(entry, analysis.id))
    db.commit()
    _enqueue(analysis.id)
    return AnalysisAccepted(id=analysis.id, status=analysis.status)


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="analysis not found")

    payload: dict[str, Any] = {
        "id": analysis.id,
        "source": analysis.source,
        "username": analysis.username,
        "status": analysis.status,
        "stage": analysis.stage,
        "error_code": analysis.error_code,
    }
    if analysis.status == AnalysisStatus.DONE and analysis.profile is not None:
        payload["result"] = analysis.profile.result
    return payload
