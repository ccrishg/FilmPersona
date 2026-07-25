import io
import zipfile

import pytest

from app.ingestion.csv_import import InvalidExportError, parse_export_zip

DIARY = """Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2026-07-01,Parasite,2019,https://boxd.it/hTha,5,Yes,,2026-06-30
2026-07-02,Aftersun,2022,https://boxd.it/xyz1,4.5,,,2026-07-02
"""

RATINGS = """Date,Name,Year,Letterboxd URI,Rating
2026-07-01,Parasite,2019,https://boxd.it/hTha,5
2025-01-15,The Godfather,1972,https://boxd.it/abc2,4.5
"""

WATCHED = """Date,Name,Year,Letterboxd URI
2026-07-01,Parasite,2019,https://boxd.it/hTha
2025-01-15,The Godfather,1972,https://boxd.it/abc2
2024-11-10,Shrek,2001,https://boxd.it/def3
"""

PROFILE = (
    "Date Joined,Username,Given Name,Family Name,Email Address,"
    'Location,Website,Bio,Pronoun,Favorite Films\n2020-01-01,testuser,,,,,,,,"Parasite, Aftersun"\n'
)


def _zip(files: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def test_diary_entries_carry_dates_ratings_and_rewatch():
    result = parse_export_zip(_zip({"diary.csv": DIARY}))

    parasite, aftersun = result.entries
    assert parasite.title == "Parasite"
    assert parasite.year == 2019
    assert str(parasite.watched_on) == "2026-06-30"
    assert parasite.rating == 5.0
    assert parasite.is_rewatch is True
    assert aftersun.is_rewatch is False


def test_sources_merge_without_duplicating_films():
    result = parse_export_zip(
        _zip({"diary.csv": DIARY, "ratings.csv": RATINGS, "watched.csv": WATCHED})
    )

    titles = [e.title for e in result.entries]
    # Parasite only from diary; Godfather from ratings; Shrek only from watched.
    assert titles == ["Parasite", "Aftersun", "The Godfather", "Shrek"]
    godfather = result.entries[2]
    assert godfather.rating == 4.5
    assert godfather.watched_on is None
    shrek = result.entries[3]
    assert shrek.rating is None


def test_profile_favorites_are_flagged():
    result = parse_export_zip(_zip({"diary.csv": DIARY, "profile.csv": PROFILE}))

    favorites = {e.title for e in result.entries if e.is_favorite}
    assert favorites == {"Parasite", "Aftersun"}


def test_not_a_zip_raises_invalid_export():
    with pytest.raises(InvalidExportError):
        parse_export_zip(b"definitely not a zip")


def test_zip_without_known_csvs_raises_invalid_export():
    with pytest.raises(InvalidExportError):
        parse_export_zip(_zip({"reviews.csv": "Date,Name\n"}))
