from pathlib import Path

from app.ingestion.letterboxd import parsers

FIXTURES = Path(__file__).parent / "fixtures" / "letterboxd"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text()


class TestParseFilmsPage:
    def test_extracts_films_with_slug_title_year(self):
        films, _ = parsers.parse_films_page(_read("films_page1.html"))

        assert len(films) == 72  # full grid page
        first = films[0]
        assert first.slug == "disclosure-day"
        assert first.title == "Disclosure Day"
        assert first.year == 2026

    def test_extracts_star_ratings_from_rated_class(self):
        films, _ = parsers.parse_films_page(_read("films_page1.html"))

        rated = [f for f in films if f.rating is not None]
        assert rated, "fixture page should contain rated films"
        assert all(0.5 <= f.rating <= 5.0 for f in rated)
        assert films[0].rating == 3.5  # rated-7 -> 3.5 stars

    def test_reads_total_pages_from_pagination(self):
        _, total_pages = parsers.parse_films_page(_read("films_page1.html"))

        assert total_pages == 36

    def test_page_without_grid_yields_nothing(self):
        films, total_pages = parsers.parse_films_page("<html><body></body></html>")

        assert films == []
        assert total_pages == 1


class TestParseProfile:
    def test_extracts_favorite_films(self):
        favorites = parsers.parse_profile_favorites(_read("profile.html"))

        assert [f.slug for f in favorites] == [
            "high-and-low",
            "burning-2018",
            "my-neighbor-totoro",
            "mulholland-drive",
        ]
        assert favorites[0].title == "High and Low"
        assert favorites[0].year == 1963

    def test_public_profile_is_not_private(self):
        assert parsers.is_profile_private(_read("profile.html")) is False

    def test_private_profile_marker_is_detected(self):
        html = "<html><body><p>This member's profile is private.</p></body></html>"
        assert parsers.is_profile_private(html) is True


class TestParseRss:
    def test_extracts_diary_entries(self):
        entries = parsers.parse_rss(_read("rss.xml"))

        assert len(entries) > 10
        first = entries[0]
        assert first.title == "Obsession"
        assert first.year == 2025
        assert first.slug == "obsession-2025"
        assert str(first.watched_on) == "2026-07-09"
        assert first.rating == 3.5
        assert first.is_rewatch is False
        assert first.tmdb_id == 1339713

    def test_all_entries_have_title_and_slug(self):
        entries = parsers.parse_rss(_read("rss.xml"))

        assert all(e.title for e in entries)
        assert all(e.slug for e in entries)
