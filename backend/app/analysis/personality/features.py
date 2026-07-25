"""Feature extraction: enriched watch history -> FeatureSet.

Pure functions over in-memory data — no I/O, no ORM — so the model is trivially
unit-testable with synthetic viewing diets.
"""

import math
from collections import Counter
from dataclasses import dataclass
from statistics import mean, median, stdev

from app.analysis.personality import config
from app.ingestion.models import NormalizedEntry
from app.models import Film

# One watch event paired with its TMDB metadata (None when unresolved).
EnrichedEntry = tuple[NormalizedEntry, Film | None]


@dataclass(slots=True)
class FeatureSet:
    n_films: int
    # Popularity
    median_popularity: float | None
    pct_high_popularity: float | None  # 0..1
    # Scope
    country_diversity: float  # 0..1 (capped, log-normalized Shannon entropy)
    pct_non_english: float | None  # 0..1
    n_countries: int
    # Habit
    genre_diversity: float  # 0..1
    director_concentration: float  # 0..1 share of watches by top-N directors
    pct_rewatch: float  # 0..1 over dated entries
    # Judgment
    avg_user_rating: float | None  # 0.5..5 stars
    rating_stddev: float | None
    rating_delta: float | None  # mean(user*2 - tmdb_vote_average), on the 0-10 scale


def _capped_entropy(counter: Counter, cap: int) -> float:
    """Shannon entropy normalized by log(cap): 0 = monoculture, 1 = broad and even."""
    total = sum(counter.values())
    if total == 0:
        return 0.0
    entropy = -sum((c / total) * math.log(c / total) for c in counter.values())
    return min(entropy / math.log(cap), 1.0)


def extract_features(entries: list[EnrichedEntry]) -> FeatureSet:
    films = {id(f): f for _, f in entries if f is not None}.values()

    popularities = [f.popularity for f in films if f.popularity is not None]
    countries = Counter(c for f in films for c in f.production_countries or [])
    genres = Counter(g for f in films for g in f.genres or [])
    languages = [f.original_language for f in films if f.original_language]
    directors = Counter(d for f in films for d in f.directors or [])

    ratings = [e.rating for e, _ in entries if e.rating is not None]
    dated = [e for e, _ in entries if e.watched_on is not None]

    deltas = [
        e.rating * 2 - f.vote_average
        for e, f in entries
        if e.rating is not None and f is not None and f.vote_average
    ]

    top_share = 0.0
    if directors:
        top = sum(count for _, count in directors.most_common(config.TOP_DIRECTORS))
        top_share = top / sum(directors.values())

    return FeatureSet(
        n_films=len(list(films)),
        median_popularity=median(popularities) if popularities else None,
        pct_high_popularity=(
            sum(p > config.POPULARITY_HIGH for p in popularities) / len(popularities)
            if popularities
            else None
        ),
        country_diversity=_capped_entropy(countries, config.COUNTRY_DIVERSITY_CAP),
        pct_non_english=(
            sum(lang != "en" for lang in languages) / len(languages) if languages else None
        ),
        n_countries=len(countries),
        genre_diversity=_capped_entropy(genres, config.GENRE_DIVERSITY_CAP),
        director_concentration=top_share,
        pct_rewatch=(sum(e.is_rewatch for e in dated) / len(dated)) if dated else 0.0,
        avg_user_rating=mean(ratings) if ratings else None,
        rating_stddev=stdev(ratings) if len(ratings) > 1 else None,
        rating_delta=mean(deltas) if deltas else None,
    )
