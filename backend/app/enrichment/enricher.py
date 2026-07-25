"""Film enrichment with two cache layers.

1. The `films` table is the durable cache: once a film is resolved via TMDB it is
   stored and reused by every later analysis (no TTL — film metadata is stable).
2. Redis holds a 24h negative cache for lookups that found nothing on TMDB, so a
   repeated analysis doesn't re-search the same unresolvable titles.
"""

import logging
from datetime import UTC, datetime

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.enrichment.tmdb import TmdbClient, TmdbFilm
from app.ingestion.models import NormalizedEntry
from app.models import Film

logger = logging.getLogger(__name__)


def film_key(entry: NormalizedEntry) -> str:
    """Stable identity of a film across entries (slug when scraped, title/year for CSV)."""
    return entry.letterboxd_slug or f"{entry.title.lower()}|{entry.year or ''}"


class Enricher:
    def __init__(
        self,
        db: Session,
        tmdb: TmdbClient | None = None,
        redis_client: aioredis.Redis | None = None,
    ):
        settings = get_settings()
        self._db = db
        self._tmdb = tmdb or TmdbClient()
        self._redis = redis_client or aioredis.from_url(settings.redis_url)
        self._negative_ttl = settings.cache_ttl_seconds

    async def aclose(self) -> None:
        await self._tmdb.aclose()
        await self._redis.aclose()

    async def enrich(self, entries: list[NormalizedEntry]) -> dict[str, Film]:
        """Resolve every distinct film in `entries` to a Film row. Returns key -> Film."""
        distinct: dict[str, NormalizedEntry] = {}
        for entry in entries:
            distinct.setdefault(film_key(entry), entry)

        resolved: dict[str, Film] = {}
        for key, entry in distinct.items():
            film = await self._enrich_one(key, entry)
            if film is not None:
                resolved[key] = film
        self._db.commit()
        return resolved

    async def _enrich_one(self, key: str, entry: NormalizedEntry) -> Film | None:
        film = self._find_cached(entry)
        if film is not None and film.enriched_at is not None:
            return film

        negative_key = f"tmdb:miss:{key}"
        if await self._redis.get(negative_key):
            return film

        try:
            metadata = await self._tmdb.resolve(entry.title, entry.year, entry.tmdb_id)
        except Exception:
            logger.exception("TMDB lookup failed for %s", key)
            return film

        if metadata is None:
            await self._redis.set(negative_key, "1", ex=self._negative_ttl)
            return film

        return self._upsert_film(film, entry, metadata)

    def _find_cached(self, entry: NormalizedEntry) -> Film | None:
        if entry.letterboxd_slug:
            film = self._db.scalar(
                select(Film).where(Film.letterboxd_slug == entry.letterboxd_slug)
            )
            if film is not None:
                return film
        if entry.tmdb_id:
            return self._db.scalar(select(Film).where(Film.tmdb_id == entry.tmdb_id))
        return self._db.scalar(
            select(Film).where(Film.title == entry.title, Film.year == entry.year)
        )

    def _upsert_film(self, film: Film | None, entry: NormalizedEntry, meta: TmdbFilm) -> Film:
        # The same TMDB film can be reached via different entries (slug vs title).
        existing = self._db.scalar(select(Film).where(Film.tmdb_id == meta.tmdb_id))
        film = film or existing or Film(title=meta.title)

        film.tmdb_id = meta.tmdb_id
        film.letterboxd_slug = film.letterboxd_slug or entry.letterboxd_slug
        film.title = meta.title or entry.title
        film.year = meta.year or entry.year
        film.directors = meta.directors
        film.genres = meta.genres
        film.production_countries = meta.production_countries
        film.original_language = meta.original_language
        film.popularity = meta.popularity
        film.vote_average = meta.vote_average
        film.runtime = meta.runtime
        film.enriched_at = datetime.now(UTC)

        self._db.add(film)
        self._db.flush()
        return film
