import httpx
import pytest
import respx

from app.enrichment.tmdb import BASE_URL, TmdbClient

SEARCH_RESPONSE = {"results": [{"id": 496243, "title": "Parasite"}]}

MOVIE_RESPONSE = {
    "id": 496243,
    "title": "Parasite",
    "release_date": "2019-05-30",
    "genres": [{"id": 35, "name": "Comedy"}, {"id": 53, "name": "Thriller"}],
    "production_countries": [{"iso_3166_1": "KR", "name": "South Korea"}],
    "original_language": "ko",
    "popularity": 87.4,
    "vote_average": 8.5,
    "runtime": 133,
    "credits": {
        "crew": [
            {"name": "Bong Joon Ho", "job": "Director"},
            {"name": "Hong Kyung-pyo", "job": "Director of Photography"},
        ]
    },
}


@pytest.fixture
def client():
    return TmdbClient(client=httpx.AsyncClient(base_url=BASE_URL, params={"api_key": "test"}))


@respx.mock
async def test_resolve_searches_then_fetches_details(client):
    respx.get(f"{BASE_URL}/search/movie").respond(json=SEARCH_RESPONSE)
    respx.get(f"{BASE_URL}/movie/496243").respond(json=MOVIE_RESPONSE)

    film = await client.resolve("Parasite", 2019, tmdb_id=None)

    assert film is not None
    assert film.tmdb_id == 496243
    assert film.year == 2019
    assert film.directors == ["Bong Joon Ho"]
    assert film.genres == ["Comedy", "Thriller"]
    assert film.production_countries == ["KR"]
    assert film.original_language == "ko"
    assert film.runtime == 133


@respx.mock
async def test_resolve_with_known_id_skips_search(client):
    details = respx.get(f"{BASE_URL}/movie/496243").respond(json=MOVIE_RESPONSE)
    search = respx.get(f"{BASE_URL}/search/movie").respond(json=SEARCH_RESPONSE)

    film = await client.resolve("Parasite", 2019, tmdb_id=496243)

    assert film is not None
    assert details.called
    assert not search.called


@respx.mock
async def test_search_retries_without_year_on_miss(client):
    def responder(request: httpx.Request) -> httpx.Response:
        if b"primary_release_year" in request.url.query:
            return httpx.Response(200, json={"results": []})
        return httpx.Response(200, json=SEARCH_RESPONSE)

    respx.get(f"{BASE_URL}/search/movie").mock(side_effect=responder)

    movie_id = await client.search_movie_id("Parasite", 2019)

    assert movie_id == 496243


@respx.mock
async def test_resolve_returns_none_when_nothing_found(client):
    respx.get(f"{BASE_URL}/search/movie").respond(json={"results": []})

    film = await client.resolve("Totally Made Up Film", None, tmdb_id=None)

    assert film is None
