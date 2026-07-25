"""Async Letterboxd fetcher: rate-limited HTTP + error classification.

Only fetches raw HTML/XML; all markup knowledge lives in parsers.py.
"""

import asyncio
import logging
import time

import httpx

from app.config import get_settings
from app.ingestion.letterboxd import parsers
from app.ingestion.models import IngestResult, NormalizedEntry

logger = logging.getLogger(__name__)

BASE_URL = "https://letterboxd.com"
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


class LetterboxdError(Exception):
    """Base class for ingestion errors with a stable machine-readable code."""

    code = "INTERNAL_ERROR"


class ProfileNotFoundError(LetterboxdError):
    code = "PROFILE_NOT_FOUND"


class ProfilePrivateError(LetterboxdError):
    code = "PROFILE_PRIVATE"


class ScrapeBlockedError(LetterboxdError):
    """Letterboxd (or its CDN, e.g. Cloudflare) refused this request."""

    code = "SCRAPE_BLOCKED"


class _RateLimiter:
    """Ensures a minimum delay between consecutive requests."""

    def __init__(self, min_delay_seconds: float):
        self._min_delay = min_delay_seconds
        self._last_request = 0.0
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            elapsed = time.monotonic() - self._last_request
            if elapsed < self._min_delay:
                await asyncio.sleep(self._min_delay - elapsed)
            self._last_request = time.monotonic()


class LetterboxdClient:
    def __init__(self, client: httpx.AsyncClient | None = None):
        settings = get_settings()
        self._max_pages = settings.scrape_max_diary_pages
        self._limiter = _RateLimiter(settings.scrape_min_delay_seconds)
        self._client = client or httpx.AsyncClient(
            base_url=BASE_URL,
            http2=True,  # closer to a real browser's TLS/ALPN fingerprint than HTTP/1.1
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout=20.0,
            follow_redirects=True,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, retry_on_block: bool = True) -> httpx.Response:
        await self._limiter.wait()
        response = await self._client.get(path)
        if response.status_code == 404:
            raise ProfileNotFoundError(path)
        if response.status_code in (403, 429):
            if retry_on_block:
                # A short-lived rate limit clears; a hard CDN block does not — one
                # retry with a longer pause tells them apart without much cost.
                await asyncio.sleep(self._limiter._min_delay * 4)
                return await self._get(path, retry_on_block=False)
            raise ScrapeBlockedError(f"{path} -> {response.status_code}")
        response.raise_for_status()
        return response

    async def fetch_history(self, username: str) -> IngestResult:
        """Full scrape: watched grid (all pages) + RSS diary dates + favorites."""
        profile_html = (await self._get(f"/{username}/")).text
        if parsers.is_profile_private(profile_html):
            raise ProfilePrivateError(username)
        favorite_films = parsers.parse_profile_favorites(profile_html)
        favorites = {f.slug for f in favorite_films}

        # Watched grid: every film the member has marked as seen, with ratings.
        films, total_pages = parsers.parse_films_page((await self._get(f"/{username}/films/")).text)
        for page in range(2, min(total_pages, self._max_pages) + 1):
            try:
                page_films, _ = parsers.parse_films_page(
                    (await self._get(f"/{username}/films/page/{page}/")).text
                )
            except ScrapeBlockedError:
                # Letterboxd/Cloudflare cut us off partway through pagination —
                # keep the films from the pages we did get rather than losing them.
                logger.warning(
                    "Blocked fetching page %d/%d for %s, keeping %d films from earlier pages",
                    page,
                    total_pages,
                    username,
                    len(films),
                )
                break
            films.extend(page_films)

        # RSS: recent diary entries carry watch dates, rewatch flags and TMDB ids.
        # This is an enrichment source, not the primary one — don't fail the whole
        # scrape if it's unreachable.
        try:
            rss_entries = parsers.parse_rss((await self._get(f"/{username}/rss/")).text)
        except ScrapeBlockedError:
            logger.warning("Blocked fetching RSS feed for %s, continuing without it", username)
            rss_entries = []
        by_slug = {e.slug: e for e in rss_entries if e.slug}

        entries: list[NormalizedEntry] = []
        seen_slugs: set[str] = set()
        for film in films:
            seen_slugs.add(film.slug)
            rss = by_slug.get(film.slug)
            entries.append(
                NormalizedEntry(
                    title=film.title,
                    year=film.year or (rss.year if rss else None),
                    letterboxd_slug=film.slug,
                    watched_on=rss.watched_on if rss else None,
                    rating=(
                        film.rating if film.rating is not None else (rss.rating if rss else None)
                    ),
                    is_rewatch=rss.is_rewatch if rss else False,
                    is_favorite=film.slug in favorites,
                    tmdb_id=rss.tmdb_id if rss else None,
                )
            )

        # RSS entries not present in the grid yet (rare timing gap).
        for slug, rss in by_slug.items():
            if slug not in seen_slugs:
                seen_slugs.add(slug)
                entries.append(
                    NormalizedEntry(
                        title=rss.title,
                        year=rss.year,
                        letterboxd_slug=slug,
                        watched_on=rss.watched_on,
                        rating=rss.rating,
                        is_rewatch=rss.is_rewatch,
                        is_favorite=slug in favorites,
                        tmdb_id=rss.tmdb_id,
                    )
                )

        # Favorites are always part of the history (a favorite implies watched),
        # even when the page cap left them out of the fetched grid pages.
        for film in favorite_films:
            if film.slug not in seen_slugs:
                entries.append(
                    NormalizedEntry(
                        title=film.title,
                        year=film.year,
                        letterboxd_slug=film.slug,
                        is_favorite=True,
                    )
                )

        return IngestResult(entries=entries, username=username)
