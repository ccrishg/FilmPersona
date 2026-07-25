"""Parse a Letterboxd data-export ZIP (Settings -> Data -> Export) into NormalizedEntry.

Files used, in priority order:
- diary.csv    : dated watch events with ratings and rewatch flag (best signal)
- ratings.csv  : rated films — fills in films never logged in the diary
- watched.csv  : everything marked as seen — fills in unrated, un-logged films
- profile.csv  : favorite films (optional column "Favorite Films")

All three share the columns Name / Year / Letterboxd URI.
"""

import csv
import io
import zipfile
from datetime import date

from app.ingestion.models import IngestResult, NormalizedEntry


class InvalidExportError(Exception):
    code = "INVALID_EXPORT"


def _read_csv(archive: zipfile.ZipFile, filename: str) -> list[dict[str, str]]:
    try:
        raw = archive.read(filename)
    except KeyError:
        return []
    text = raw.decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text)))


def _parse_date(value: str | None) -> date | None:
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


def _parse_year(value: str | None) -> int | None:
    return int(value) if value and value.isdigit() else None


def _parse_rating(value: str | None) -> float | None:
    try:
        return float(value) if value else None
    except ValueError:
        return None


def _film_key(row: dict[str, str]) -> tuple[str, str]:
    return (row.get("Name", "").strip(), row.get("Year", "").strip())


def parse_export_zip(data: bytes) -> IngestResult:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise InvalidExportError("not a ZIP file") from exc

    diary_rows = _read_csv(archive, "diary.csv")
    ratings_rows = _read_csv(archive, "ratings.csv")
    watched_rows = _read_csv(archive, "watched.csv")
    if not diary_rows and not ratings_rows and not watched_rows:
        raise InvalidExportError("no diary.csv, ratings.csv or watched.csv in the archive")

    favorites: set[tuple[str, str]] = set()
    for row in _read_csv(archive, "profile.csv"):
        for name in (row.get("Favorite Films") or "").split(","):
            if name.strip():
                favorites.add((name.strip(), ""))  # profile.csv has no year column

    def is_favorite(title: str) -> bool:
        return (title, "") in favorites

    entries: list[NormalizedEntry] = []
    films_with_diary: set[tuple[str, str]] = set()

    for row in diary_rows:
        key = _film_key(row)
        films_with_diary.add(key)
        entries.append(
            NormalizedEntry(
                title=key[0],
                year=_parse_year(row.get("Year")),
                watched_on=_parse_date(row.get("Watched Date") or row.get("Date")),
                rating=_parse_rating(row.get("Rating")),
                is_rewatch=(row.get("Rewatch") or "").strip().lower() == "yes",
                is_favorite=is_favorite(key[0]),
            )
        )

    ratings_by_key = {_film_key(row): row for row in ratings_rows}

    for key, row in ratings_by_key.items():
        if key in films_with_diary:
            continue
        entries.append(
            NormalizedEntry(
                title=key[0],
                year=_parse_year(row.get("Year")),
                rating=_parse_rating(row.get("Rating")),
                is_favorite=is_favorite(key[0]),
            )
        )

    for row in watched_rows:
        key = _film_key(row)
        if key in films_with_diary or key in ratings_by_key:
            continue
        entries.append(
            NormalizedEntry(
                title=key[0],
                year=_parse_year(row.get("Year")),
                is_favorite=is_favorite(key[0]),
            )
        )

    return IngestResult(entries=entries)
