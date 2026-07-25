from pathlib import Path

import pytest
import respx

from app.ingestion.letterboxd.client import (
    BASE_URL,
    LetterboxdClient,
    ProfileNotFoundError,
    ProfilePrivateError,
    ScrapeBlockedError,
)

FIXTURES = Path(__file__).parent / "fixtures" / "letterboxd"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text()


@pytest.fixture
def fast_client(monkeypatch):
    """Client without the polite inter-request delay (unit tests only)."""
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("SCRAPE_MIN_DELAY_SECONDS", "0")
    monkeypatch.setenv("SCRAPE_MAX_DIARY_PAGES", "2")
    yield LetterboxdClient()
    get_settings.cache_clear()


@respx.mock
async def test_fetch_history_merges_grid_rss_and_favorites(fast_client):
    single_film_page = _read("films_page1.html").replace('href="/dave/films/page/2/"', "")
    respx.get(f"{BASE_URL}/dave/").respond(html=_read("profile.html"))
    # Cap pages at 2 (settings): page 1 + page 2 out of the fixture's 36.
    respx.get(f"{BASE_URL}/dave/films/").respond(html=_read("films_page1.html"))
    respx.get(f"{BASE_URL}/dave/films/page/2/").respond(html=single_film_page)
    respx.get(f"{BASE_URL}/dave/rss/").respond(
        content=_read("rss.xml"), headers={"content-type": "application/xml"}
    )

    result = await fast_client.fetch_history("dave")

    assert result.username == "dave"
    assert len(result.entries) > 100
    favorites = {e.letterboxd_slug for e in result.entries if e.is_favorite}
    assert "high-and-low" in favorites
    dated = [e for e in result.entries if e.watched_on is not None]
    assert dated, "RSS dates should be merged into grid entries"
    with_tmdb = [e for e in result.entries if e.tmdb_id is not None]
    assert with_tmdb, "RSS tmdb ids should be carried over"


@respx.mock
async def test_missing_profile_raises_not_found(fast_client):
    respx.get(f"{BASE_URL}/ghost/").respond(status_code=404)

    with pytest.raises(ProfileNotFoundError):
        await fast_client.fetch_history("ghost")


@respx.mock
async def test_private_profile_raises_private(fast_client):
    respx.get(f"{BASE_URL}/secret/").respond(
        html="<html><body>This member's profile is private.</body></html>"
    )

    with pytest.raises(ProfilePrivateError):
        await fast_client.fetch_history("secret")


@respx.mock
async def test_cloudflare_403_raises_blocked(fast_client):
    respx.get(f"{BASE_URL}/dave/").respond(status_code=403)

    with pytest.raises(ScrapeBlockedError):
        await fast_client.fetch_history("dave")


@respx.mock
async def test_block_on_a_later_page_keeps_earlier_pages(fast_client):
    """A Cloudflare block on page 2+ shouldn't discard films already fetched."""
    respx.get(f"{BASE_URL}/dave/").respond(html=_read("profile.html"))
    respx.get(f"{BASE_URL}/dave/films/").respond(html=_read("films_page1.html"))
    respx.get(f"{BASE_URL}/dave/films/page/2/").respond(status_code=403)
    respx.get(f"{BASE_URL}/dave/rss/").respond(
        content=_read("rss.xml"), headers={"content-type": "application/xml"}
    )

    result = await fast_client.fetch_history("dave")

    # 72 films from page 1 (the fixture grid), none from the blocked page 2.
    assert len(result.entries) >= 72


@respx.mock
async def test_blocked_rss_does_not_fail_the_whole_scrape(fast_client):
    respx.get(f"{BASE_URL}/dave/").respond(html=_read("profile.html"))
    respx.get(f"{BASE_URL}/dave/films/").respond(html=_read("films_page1.html"))
    respx.get(f"{BASE_URL}/dave/films/page/2/").respond(status_code=403)
    respx.get(f"{BASE_URL}/dave/rss/").respond(status_code=403)

    result = await fast_client.fetch_history("dave")

    assert len(result.entries) >= 72
    assert all(e.watched_on is None for e in result.entries)


@respx.mock
async def test_rate_limiter_spaces_out_requests(monkeypatch):
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("SCRAPE_MIN_DELAY_SECONDS", "0.05")

    sleeps: list[float] = []

    async def fake_sleep(seconds: float):
        sleeps.append(seconds)

    client = LetterboxdClient()
    monkeypatch.setattr("app.ingestion.letterboxd.client.asyncio.sleep", fake_sleep)
    respx.get(f"{BASE_URL}/a/").respond(html="<html></html>")
    respx.get(f"{BASE_URL}/b/").respond(html="<html></html>")

    await client._get("/a/")
    await client._get("/b/")

    assert sleeps, "second request should have waited for the rate limiter"
    get_settings.cache_clear()
