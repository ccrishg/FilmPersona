"""End-to-end pipeline tests with mocked external services (Letterboxd, TMDB, Redis)."""

from unittest.mock import AsyncMock

import pytest
from fakeredis import aioredis as fake_aioredis

from app.enrichment.enricher import Enricher
from app.enrichment.tmdb import TmdbFilm
from app.ingestion.letterboxd.client import ProfilePrivateError
from app.ingestion.models import IngestResult, NormalizedEntry
from app.models import Analysis, AnalysisSource, AnalysisStatus, ErrorCode, WatchedEntry
from app.pipeline import _run, entry_to_row

META = TmdbFilm(
    tmdb_id=496243,
    title="Parasite",
    year=2019,
    directors=["Bong Joon Ho"],
    genres=["Thriller"],
    production_countries=["KR"],
    original_language="ko",
    popularity=87.4,
    vote_average=8.5,
    runtime=133,
)


@pytest.fixture
def enricher(db_session):
    tmdb = AsyncMock()
    tmdb.resolve.return_value = META
    return Enricher(db_session, tmdb=tmdb, redis_client=fake_aioredis.FakeRedis())


@pytest.fixture
def letterboxd():
    client = AsyncMock()
    client.fetch_history.return_value = IngestResult(
        entries=[
            NormalizedEntry(
                title="Parasite", year=2019, letterboxd_slug="parasite-2019", rating=4.5
            )
        ],
        username="dave",
    )
    return client


async def test_scrape_pipeline_completes_with_profile(db_session, letterboxd, enricher):
    analysis = Analysis(source=AnalysisSource.SCRAPE, username="dave")
    db_session.add(analysis)
    db_session.commit()

    await _run(analysis.id, db=db_session, letterboxd=letterboxd, enricher=enricher)

    assert analysis.status == AnalysisStatus.DONE
    assert analysis.profile is not None
    result = analysis.profile.result
    assert result["personality"]["code"]
    assert result["stats"]["countries"][0]["country"] == "KR"
    rows = db_session.query(WatchedEntry).filter_by(analysis_id=analysis.id).all()
    assert rows[0].film_id is not None  # entry linked to the enriched film


async def test_csv_pipeline_uses_preloaded_entries(db_session, enricher):
    analysis = Analysis(source=AnalysisSource.CSV_IMPORT)
    db_session.add(analysis)
    db_session.flush()
    db_session.add(
        entry_to_row(NormalizedEntry(title="Parasite", year=2019, rating=5.0), analysis.id)
    )
    db_session.commit()

    await _run(analysis.id, db=db_session, letterboxd=AsyncMock(), enricher=enricher)

    assert analysis.status == AnalysisStatus.DONE
    assert analysis.profile.result["stats"]["totals"]["films"] == 1


async def test_private_profile_fails_with_error_code(db_session, enricher):
    letterboxd = AsyncMock()
    letterboxd.fetch_history.side_effect = ProfilePrivateError("secret")
    analysis = Analysis(source=AnalysisSource.SCRAPE, username="secret")
    db_session.add(analysis)
    db_session.commit()

    await _run(analysis.id, db=db_session, letterboxd=letterboxd, enricher=enricher)

    assert analysis.status == AnalysisStatus.FAILED
    assert analysis.error_code == ErrorCode.PROFILE_PRIVATE
    assert analysis.profile is None


async def test_empty_history_fails_with_error_code(db_session, enricher):
    letterboxd = AsyncMock()
    letterboxd.fetch_history.return_value = IngestResult(entries=[], username="empty")
    analysis = Analysis(source=AnalysisSource.SCRAPE, username="empty")
    db_session.add(analysis)
    db_session.commit()

    await _run(analysis.id, db=db_session, letterboxd=letterboxd, enricher=enricher)

    assert analysis.status == AnalysisStatus.FAILED
    assert analysis.error_code == ErrorCode.EMPTY_HISTORY


async def test_unexpected_crash_marks_internal_error(db_session, enricher):
    letterboxd = AsyncMock()
    letterboxd.fetch_history.side_effect = RuntimeError("boom")
    analysis = Analysis(source=AnalysisSource.SCRAPE, username="dave")
    db_session.add(analysis)
    db_session.commit()

    await _run(analysis.id, db=db_session, letterboxd=letterboxd, enricher=enricher)

    assert analysis.status == AnalysisStatus.FAILED
    assert analysis.error_code == ErrorCode.INTERNAL_ERROR
