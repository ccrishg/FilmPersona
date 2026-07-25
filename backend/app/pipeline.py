"""ETL orchestration: ingest -> enrich -> analyze -> persist, with stage tracking.

Runs inside the Celery worker. Each stage updates Analysis.stage/status so the
frontend can show progress while polling.
"""

import asyncio
import logging

from sqlalchemy.orm import Session

from app.analysis.engine import build_profile
from app.analysis.personality import config as personality_config
from app.db import SessionLocal
from app.enrichment.enricher import Enricher, film_key
from app.ingestion.letterboxd.client import LetterboxdClient, LetterboxdError
from app.ingestion.models import NormalizedEntry
from app.models import (
    Analysis,
    AnalysisSource,
    AnalysisStage,
    AnalysisStatus,
    ErrorCode,
    Profile,
    WatchedEntry,
)

logger = logging.getLogger(__name__)


def entry_to_row(entry: NormalizedEntry, analysis_id: str) -> WatchedEntry:
    return WatchedEntry(
        analysis_id=analysis_id,
        title=entry.title,
        year=entry.year,
        letterboxd_slug=entry.letterboxd_slug,
        watched_on=entry.watched_on,
        rating=entry.rating,
        is_rewatch=entry.is_rewatch,
        is_favorite=entry.is_favorite,
    )


def row_to_entry(row: WatchedEntry) -> NormalizedEntry:
    return NormalizedEntry(
        title=row.title,
        year=row.year,
        letterboxd_slug=row.letterboxd_slug,
        watched_on=row.watched_on,
        rating=row.rating,
        is_rewatch=row.is_rewatch,
        is_favorite=row.is_favorite,
    )


class PipelineError(Exception):
    def __init__(self, code: ErrorCode, detail: str = ""):
        self.code = code
        self.detail = detail
        super().__init__(detail or code)


def run_pipeline(analysis_id: str) -> None:
    """Synchronous entry point used by the Celery task."""
    asyncio.run(_run(analysis_id))


async def _run(
    analysis_id: str,
    db: Session | None = None,
    letterboxd: LetterboxdClient | None = None,
    enricher: Enricher | None = None,
) -> None:
    own_session = db is None
    db = db or SessionLocal()
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        logger.error("Analysis %s not found", analysis_id)
        return

    try:
        analysis.status = AnalysisStatus.RUNNING
        db.commit()

        entries = await _ingest(analysis, db, letterboxd)
        films = await _enrich(analysis, db, entries, enricher)
        _analyze(analysis, db, entries, films)

        analysis.status = AnalysisStatus.DONE
        analysis.stage = None
    except PipelineError as exc:
        analysis.status = AnalysisStatus.FAILED
        analysis.error_code = exc.code
        analysis.error_detail = exc.detail
    except LetterboxdError as exc:
        analysis.status = AnalysisStatus.FAILED
        analysis.error_code = ErrorCode(exc.code)
        analysis.error_detail = str(exc)
    except Exception:
        logger.exception("Pipeline failed for analysis %s", analysis_id)
        analysis.status = AnalysisStatus.FAILED
        analysis.error_code = ErrorCode.INTERNAL_ERROR
    finally:
        db.commit()
        if own_session:
            db.close()


async def _ingest(
    analysis: Analysis, db: Session, letterboxd: LetterboxdClient | None
) -> list[NormalizedEntry]:
    """Scrape (or load pre-imported) watch history and persist it."""
    analysis.stage = AnalysisStage.INGEST
    db.commit()

    if analysis.source == AnalysisSource.CSV_IMPORT:
        # Entries were persisted by the upload endpoint at import time.
        rows = db.query(WatchedEntry).filter_by(analysis_id=analysis.id).all()
        entries = [row_to_entry(row) for row in rows]
    else:
        client = letterboxd or LetterboxdClient()
        try:
            result = await client.fetch_history(analysis.username or "")
        finally:
            await client.aclose()
        entries = result.entries
        for entry in entries:
            db.add(entry_to_row(entry, analysis.id))
        db.commit()

    if not entries:
        raise PipelineError(ErrorCode.EMPTY_HISTORY, "no watched films found")
    return entries


async def _enrich(
    analysis: Analysis,
    db: Session,
    entries: list[NormalizedEntry],
    enricher: Enricher | None,
) -> dict:
    analysis.stage = AnalysisStage.ENRICH
    db.commit()

    enricher = enricher or Enricher(db)
    try:
        films = await enricher.enrich(entries)
    finally:
        await enricher.aclose()

    # Link entry rows to their resolved film for future queries.
    rows = db.query(WatchedEntry).filter_by(analysis_id=analysis.id).all()
    for row in rows:
        film = films.get(film_key(row_to_entry(row)))
        if film is not None:
            row.film_id = film.id
    db.commit()
    return films


def _analyze(analysis: Analysis, db: Session, entries: list[NormalizedEntry], films: dict) -> None:
    analysis.stage = AnalysisStage.ANALYZE
    db.commit()

    pairs = [(entry, films.get(film_key(entry))) for entry in entries]
    result = build_profile(pairs)
    db.add(
        Profile(
            analysis_id=analysis.id,
            model_version=personality_config.MODEL_VERSION,
            result=result,
        )
    )
