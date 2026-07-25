"""Pure HTML/XML -> dataclass parsers for Letterboxd pages.

These functions are the ONLY place that knows Letterboxd markup. They are tested
against saved fixture pages (tests/fixtures/letterboxd/); if Letterboxd changes
its HTML, re-save the fixtures and update these parsers — nothing else changes.

Markup notes (captured 2026-07):
- /{user}/films/page/{n}/ : li.griditem > div[data-item-slug][data-item-name="Title (Year)"]
  with sibling p.poster-viewingdata > span.rating.rated-N (N = stars * 2).
- /{user}/rss/ : RSS items with letterboxd:* extensions (watchedDate, rewatch,
  filmTitle, filmYear, memberRating) and tmdb:movieId.
- /{user}/ : section#favourites > li.griditem > div[data-item-slug].
- The /films/diary/ HTML pages sit behind a Cloudflare challenge, so the RSS feed
  is our source of (recent) diary dates when scraping.
"""

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date

from bs4 import BeautifulSoup, Tag

_TITLE_YEAR_RE = re.compile(r"^(?P<title>.*?)\s+\((?P<year>\d{4})\)$")
_RATED_CLASS_RE = re.compile(r"^rated-(\d+)$")

_RSS_NS = {
    "letterboxd": "https://letterboxd.com",
    "tmdb": "https://themoviedb.org",
}


@dataclass(slots=True)
class GridFilm:
    """A film from the watched-films poster grid."""

    slug: str
    title: str
    year: int | None
    rating: float | None  # 0.5-5.0 stars


@dataclass(slots=True)
class RssDiaryEntry:
    """A diary entry from the member RSS feed."""

    slug: str | None
    title: str
    year: int | None
    watched_on: date | None
    rating: float | None
    is_rewatch: bool
    tmdb_id: int | None


def _split_title_year(name: str) -> tuple[str, int | None]:
    match = _TITLE_YEAR_RE.match(name.strip())
    if match:
        return match.group("title"), int(match.group("year"))
    return name.strip(), None


def _rating_from_classes(classes: list[str]) -> float | None:
    for cls in classes:
        match = _RATED_CLASS_RE.match(cls)
        if match:
            return int(match.group(1)) / 2
    return None


def parse_films_page(html: str) -> tuple[list[GridFilm], int]:
    """Parse one /films/ grid page. Returns (films, total_pages)."""
    soup = BeautifulSoup(html, "lxml")
    films: list[GridFilm] = []

    for item in soup.select("li.griditem"):
        poster = item.select_one("[data-item-slug]")
        if not isinstance(poster, Tag):
            continue
        slug = str(poster["data-item-slug"])
        title, year = _split_title_year(str(poster.get("data-item-name", "")))

        rating = None
        rating_span = item.select_one("p.poster-viewingdata span.rating")
        if isinstance(rating_span, Tag):
            rating = _rating_from_classes([str(c) for c in rating_span.get("class") or []])

        films.append(GridFilm(slug=slug, title=title, year=year, rating=rating))

    total_pages = 1
    for link in soup.select("div.paginate-pages li.paginate-page"):
        digits = link.get_text(strip=True)
        if digits.isdigit():
            total_pages = max(total_pages, int(digits))

    return films, total_pages


def parse_profile_favorites(html: str) -> list[GridFilm]:
    """Extract the (up to 4) favorite films from a profile page."""
    soup = BeautifulSoup(html, "lxml")
    favorites: list[GridFilm] = []
    for poster in soup.select("section#favourites [data-item-slug]"):
        title, year = _split_title_year(str(poster.get("data-item-name", "")))
        favorites.append(
            GridFilm(slug=str(poster["data-item-slug"]), title=title, year=year, rating=None)
        )
    return favorites


def is_profile_private(html: str) -> bool:
    """Detect the private-profile page variant ("This member's profile is private")."""
    return "profile is private" in html.lower()


def _slug_from_film_url(url: str) -> str | None:
    # e.g. https://letterboxd.com/dave/film/obsession-2025/ -> obsession-2025
    match = re.search(r"/film/([^/]+)/?", url)
    return match.group(1) if match else None


def parse_rss(xml_text: str) -> list[RssDiaryEntry]:
    """Parse the member RSS feed into diary entries (watches only, not lists)."""
    root = ET.fromstring(xml_text)
    entries: list[RssDiaryEntry] = []

    for item in root.iter("item"):
        watched_text = item.findtext("letterboxd:watchedDate", namespaces=_RSS_NS)
        title = item.findtext("letterboxd:filmTitle", namespaces=_RSS_NS)
        if title is None:
            continue  # list announcements and other non-watch items

        year_text = item.findtext("letterboxd:filmYear", namespaces=_RSS_NS)
        rating_text = item.findtext("letterboxd:memberRating", namespaces=_RSS_NS)
        rewatch_text = item.findtext("letterboxd:rewatch", namespaces=_RSS_NS) or "No"
        tmdb_text = item.findtext("tmdb:movieId", namespaces=_RSS_NS)
        link = item.findtext("link") or ""

        entries.append(
            RssDiaryEntry(
                slug=_slug_from_film_url(link),
                title=title,
                year=int(year_text) if year_text else None,
                watched_on=date.fromisoformat(watched_text) if watched_text else None,
                rating=float(rating_text) if rating_text else None,
                is_rewatch=rewatch_text.strip().lower() == "yes",
                tmdb_id=int(tmdb_text) if tmdb_text else None,
            )
        )

    return entries
