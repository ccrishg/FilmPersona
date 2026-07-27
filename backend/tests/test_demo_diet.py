"""Anti-drift lock for the /how-it-works demo on the frontend.

frontend/src/data/demoDiet.ts hardcodes this exact diet's scores so the page can
show a step-by-step example without calling the API. This test reconstructs the
same diet through the real model — if config.py changes and these numbers drift,
this test fails and tells you to regenerate demoDiet.ts (see the script referenced
in that file's header comment).
"""

from datetime import date

from app.analysis.personality.archetypes import get_archetype
from app.analysis.personality.axes import compute_axes, personality_code
from app.analysis.personality.features import extract_features
from app.ingestion.models import NormalizedEntry
from app.models import Film

DIET = [
    # title, year, slug, rating, watched_on, rewatch, favorite,
    # directors, genres, countries, lang, popularity, vote_avg, runtime
    ("Parasite", 2019, "parasite-2019", 5.0, date(2026, 1, 10), False, True,
     ["Bong Joon Ho"], ["Comedy", "Thriller", "Drama"], ["KR"], "ko", 87.4, 8.5, 133),
    ("Barbie", 2023, "barbie", 3.5, date(2026, 2, 14), False, False,
     ["Greta Gerwig"], ["Comedy", "Adventure", "Fantasy"], ["US"], "en", 180.2, 7.0, 114),
    ("My Neighbor Totoro", 1988, "my-neighbor-totoro", 4.5, date(2026, 3, 2), True, False,
     ["Hayao Miyazaki"], ["Animation", "Family", "Fantasy"], ["JP"], "ja", 122.6, 8.0, 86),
    ("Amélie", 2001, "amelie", 4.0, date(2026, 4, 20), False, False,
     ["Jean-Pierre Jeunet"], ["Comedy", "Romance"], ["FR"], "fr", 45.3, 7.7, 122),
    ("Mad Max: Fury Road", 2015, "mad-max-fury-road", 4.0, date(2026, 5, 30), False, False,
     ["George Miller"], ["Action", "Adventure", "Science Fiction"],
     ["AU", "US"], "en", 151.9, 7.6, 121),
    ("Aftersun", 2022, "aftersun", 4.5, date(2026, 6, 15), False, False,
     ["Charlotte Wells"], ["Drama"], ["GB", "US"], "en", 24.8, 7.6, 102),
]  # fmt: skip


def _build_pairs():
    pairs = []
    for (
        title, year, slug, rating, watched, rewatch, fav,
        directors, genres, countries, lang, pop, vote, runtime,
    ) in DIET:  # fmt: skip
        entry = NormalizedEntry(
            title=title,
            year=year,
            letterboxd_slug=slug,
            rating=rating,
            watched_on=watched,
            is_rewatch=rewatch,
            is_favorite=fav,
        )
        film = Film(
            title=title,
            year=year,
            letterboxd_slug=slug,
            directors=directors,
            genres=genres,
            production_countries=countries,
            original_language=lang,
            popularity=pop,
            vote_average=vote,
            runtime=runtime,
        )
        pairs.append((entry, film))
    return pairs


def test_demo_diet_matches_the_frontend_walkthrough():
    """If this fails, regenerate frontend/src/data/demoDiet.ts from these numbers."""
    features = extract_features(_build_pairs())
    axes = compute_axes(features)
    code = personality_code(axes)

    scores = {axis.key: axis.score for axis in axes}
    assert scores == {
        "popularity": 25,
        "scope": 59,
        "habit": 70,
        "judgment": 31,
    }
    assert code == "MGEH"
    assert get_archetype(code).name == "The Popcorn Polyglot"
