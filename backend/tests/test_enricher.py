from unittest.mock import AsyncMock

import pytest
from fakeredis import aioredis as fake_aioredis

from app.enrichment.enricher import Enricher, film_key
from app.enrichment.tmdb import TmdbFilm
from app.ingestion.models import NormalizedEntry
from app.models import Film

PARASITE_META = TmdbFilm(
    tmdb_id=496243,
    title="Parasite",
    year=2019,
    directors=["Bong Joon Ho"],
    genres=["Comedy", "Thriller"],
    production_countries=["KR"],
    original_language="ko",
    popularity=87.4,
    vote_average=8.5,
    runtime=133,
)


@pytest.fixture
def fake_redis():
    return fake_aioredis.FakeRedis()


@pytest.fixture
def tmdb_mock():
    mock = AsyncMock()
    mock.resolve.return_value = PARASITE_META
    return mock


def _entry(**kwargs) -> NormalizedEntry:
    defaults = {"title": "Parasite", "year": 2019, "letterboxd_slug": "parasite-2019"}
    return NormalizedEntry(**{**defaults, **kwargs})


async def test_enrich_creates_film_rows(db_session, tmdb_mock, fake_redis):
    enricher = Enricher(db_session, tmdb=tmdb_mock, redis_client=fake_redis)

    resolved = await enricher.enrich([_entry()])

    film = resolved[film_key(_entry())]
    assert film.tmdb_id == 496243
    assert film.production_countries == ["KR"]
    assert film.enriched_at is not None
    assert db_session.query(Film).count() == 1


async def test_already_enriched_film_skips_tmdb(db_session, tmdb_mock, fake_redis):
    enricher = Enricher(db_session, tmdb=tmdb_mock, redis_client=fake_redis)
    await enricher.enrich([_entry()])
    tmdb_mock.resolve.reset_mock()

    resolved = await enricher.enrich([_entry()])

    assert tmdb_mock.resolve.await_count == 0
    assert resolved[film_key(_entry())].tmdb_id == 496243


async def test_duplicate_entries_resolve_once(db_session, tmdb_mock, fake_redis):
    enricher = Enricher(db_session, tmdb=tmdb_mock, redis_client=fake_redis)

    await enricher.enrich([_entry(), _entry(is_rewatch=True), _entry(rating=5.0)])

    assert tmdb_mock.resolve.await_count == 1
    assert db_session.query(Film).count() == 1


async def test_unresolvable_film_is_negative_cached(db_session, tmdb_mock, fake_redis):
    tmdb_mock.resolve.return_value = None
    enricher = Enricher(db_session, tmdb=tmdb_mock, redis_client=fake_redis)

    first = await enricher.enrich([_entry(title="Unknown", letterboxd_slug="unknown")])
    second = await enricher.enrich([_entry(title="Unknown", letterboxd_slug="unknown")])

    assert first == {} and second == {}
    assert tmdb_mock.resolve.await_count == 1  # second run hit the negative cache


async def test_tmdb_failure_does_not_break_enrichment(db_session, tmdb_mock, fake_redis):
    tmdb_mock.resolve.side_effect = [RuntimeError("TMDB down"), PARASITE_META]
    enricher = Enricher(db_session, tmdb=tmdb_mock, redis_client=fake_redis)

    resolved = await enricher.enrich(
        [_entry(), _entry(title="Aftersun", year=2022, letterboxd_slug="aftersun")]
    )

    # The failed film is skipped, the other one still resolves.
    assert len(resolved) == 1
