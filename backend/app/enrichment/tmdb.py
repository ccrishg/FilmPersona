"""Async TMDB API client.

Resolves a film (by known TMDB id, or by title+year search) into the metadata
the analysis needs: countries, genres, language, directors, popularity, runtime.
"""

from dataclasses import dataclass

import httpx

from app.config import get_settings

BASE_URL = "https://api.themoviedb.org/3"


@dataclass(slots=True)
class TmdbFilm:
    tmdb_id: int
    title: str
    year: int | None
    directors: list[str]
    genres: list[str]
    production_countries: list[str]  # ISO 3166-1 alpha-2
    original_language: str | None
    popularity: float | None
    vote_average: float | None
    runtime: int | None


class TmdbClient:
    def __init__(self, client: httpx.AsyncClient | None = None):
        settings = get_settings()
        self._client = client or httpx.AsyncClient(
            base_url=BASE_URL,
            params={"api_key": settings.tmdb_api_key},
            timeout=15.0,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def search_movie_id(self, title: str, year: int | None) -> int | None:
        """Search TMDB for a movie; return the best-match id or None."""
        params: dict[str, str | int] = {"query": title}
        if year:
            params["primary_release_year"] = year
        response = await self._client.get("/search/movie", params=params)
        response.raise_for_status()
        results = response.json().get("results", [])
        if not results and year:
            # Letterboxd and TMDB sometimes disagree on the release year.
            return await self.search_movie_id(title, None)
        return results[0]["id"] if results else None

    async def get_movie(self, tmdb_id: int) -> TmdbFilm | None:
        """Fetch full movie details (with credits) for a TMDB id."""
        response = await self._client.get(
            f"/movie/{tmdb_id}", params={"append_to_response": "credits"}
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()

        release_date = data.get("release_date") or ""
        directors = [
            person["name"]
            for person in data.get("credits", {}).get("crew", [])
            if person.get("job") == "Director"
        ]

        return TmdbFilm(
            tmdb_id=data["id"],
            title=data.get("title", ""),
            year=int(release_date[:4]) if len(release_date) >= 4 else None,
            directors=directors,
            genres=[g["name"] for g in data.get("genres", [])],
            production_countries=[c["iso_3166_1"] for c in data.get("production_countries", [])],
            original_language=data.get("original_language"),
            popularity=data.get("popularity"),
            vote_average=data.get("vote_average"),
            runtime=data.get("runtime"),
        )

    async def resolve(self, title: str, year: int | None, tmdb_id: int | None) -> TmdbFilm | None:
        """Resolve a film to TMDB metadata, searching by title+year if no id is known."""
        if tmdb_id is None:
            tmdb_id = await self.search_movie_id(title, year)
        if tmdb_id is None:
            return None
        return await self.get_movie(tmdb_id)
