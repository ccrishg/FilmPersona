"""Personality model tests using synthetic viewing diets.

Each diet is designed so its expected letters are unambiguous — if the model
stops classifying them correctly, a threshold or weight regressed.
"""

from datetime import date

from app.analysis.engine import build_profile
from app.analysis.personality.archetypes import ARCHETYPES
from app.analysis.personality.axes import compute_axes, personality_code
from app.analysis.personality.features import extract_features
from app.ingestion.models import NormalizedEntry
from app.models import Film


def make_film(i: int, **kwargs) -> Film:
    defaults = {
        "title": f"Film {i}",
        "year": 2020,
        "directors": [f"Director {i}"],
        "genres": ["Drama"],
        "production_countries": ["US"],
        "original_language": "en",
        "popularity": 100.0,
        "vote_average": 7.0,
        "runtime": 120,
    }
    return Film(**{**defaults, **kwargs})


def make_pair(i: int, rating=None, watched_on=None, is_rewatch=False, **film_kwargs):
    entry = NormalizedEntry(
        title=f"Film {i}",
        year=2020,
        letterboxd_slug=f"film-{i}",
        rating=rating,
        watched_on=watched_on,
        is_rewatch=is_rewatch,
    )
    return (entry, make_film(i, **film_kwargs))


def marvel_diet():
    """100% US blockbusters, same genres, rated way above the crowd."""
    return [
        make_pair(
            i,
            rating=5.0,
            watched_on=date(2026, 1 + i % 6, 1 + i),
            is_rewatch=i % 2 == 0,
            genres=["Action", "Adventure"],
            directors=["Russo Brothers"],
            popularity=250.0,
            vote_average=6.5,
        )
        for i in range(20)
    ]


def festival_diet():
    """Low-popularity world cinema across many countries, rated below the crowd."""
    countries = ["KR", "AR", "IR", "FR", "JP", "SN", "TR", "MX", "PL", "TH"]
    languages = ["ko", "es", "fa", "fr", "ja", "wo", "tr", "es", "pl", "th"]
    genre_pool = [
        ["Drama"],
        ["Documentary"],
        ["Drama", "History"],
        ["Thriller"],
        ["Comedy", "Drama"],
        ["Animation"],
        ["Mystery"],
        ["Romance"],
        ["War"],
        ["Western"],
    ]
    return [
        make_pair(
            i,
            rating=2.5,
            production_countries=[countries[i % 10]],
            original_language=languages[i % 10],
            genres=genre_pool[i % 10],
            popularity=3.0,
            vote_average=7.8,
        )
        for i in range(20)
    ]


class TestAxes:
    def test_marvel_diet_is_mainstream_local_faithful_enthusiast(self):
        code = personality_code(compute_axes(extract_features(marvel_diet())))

        assert code == "MLFH"

    def test_festival_diet_is_arthouse_global_explorer_critic(self):
        code = personality_code(compute_axes(extract_features(festival_diet())))

        assert code == "AGEC"

    def test_scores_stay_in_bounds(self):
        for diet in (marvel_diet(), festival_diet(), []):
            for axis in compute_axes(extract_features(diet)):
                assert 0 <= axis.score <= 100

    def test_empty_history_lands_in_the_middle(self):
        axes = compute_axes(extract_features([]))

        by_key = {a.key: a for a in axes}
        assert by_key["popularity"].score == 50
        assert by_key["judgment"].score == 50


class TestArchetypes:
    def test_every_combination_is_covered(self):
        from itertools import product

        expected = {"".join(combo) for combo in product("MA", "LG", "FE", "HC")}
        assert set(ARCHETYPES) == expected

    def test_names_are_unique(self):
        names = [a.name for a in ARCHETYPES.values()]
        assert len(names) == len(set(names))


class TestBuildProfile:
    def test_profile_shape_and_content(self):
        profile = build_profile(festival_diet())

        assert profile["model_version"] == "v1"
        personality = profile["personality"]
        assert personality["code"] == "AGEC"
        assert personality["archetype"]["name"] == "The World-Cinema Critic"
        assert len(personality["axes"]) == 4
        assert all("explanation" in axis for axis in personality["axes"])

        stats = profile["stats"]
        assert stats["totals"]["films"] == 20
        assert len(stats["countries"]) == 10
        assert stats["genres"][0]["count"] >= stats["genres"][-1]["count"]
        assert len(stats["rating_vs_popularity"]) == 20

    def test_unenriched_entries_still_produce_a_profile(self):
        entries = [(NormalizedEntry(title=f"Mystery {i}", year=2000), None) for i in range(10)]

        profile = build_profile(entries)

        assert profile["personality"]["code"] in ARCHETYPES
        assert profile["stats"]["totals"]["films"] == 10
