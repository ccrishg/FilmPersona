"""Descriptive statistics of a viewing history, shaped for the frontend charts."""

from collections import Counter, defaultdict
from statistics import mean
from typing import Any

from app.analysis.personality.features import EnrichedEntry


def compute_stats(entries: list[EnrichedEntry]) -> dict[str, Any]:
    films = list({id(f): f for _, f in entries if f is not None}.values())

    # World map: films per production country (ISO 3166-1 alpha-2).
    countries = Counter(c for f in films for c in f.production_countries or [])

    # Dominant genres.
    genres = Counter(g for f in films for g in f.genres or [])

    # Watches per month/day (dated entries only — full when imported from CSV export).
    by_month: dict[str, int] = defaultdict(int)
    by_day: dict[str, int] = defaultdict(int)
    for entry, _ in entries:
        if entry.watched_on:
            by_month[entry.watched_on.strftime("%Y-%m")] += 1
            by_day[entry.watched_on.isoformat()] += 1

    # Your rating vs the crowd, one point per rated+enriched film.
    scatter = [
        {
            "title": film.title,
            "year": film.year,
            "user_rating": entry.rating,
            "popularity": film.popularity,
            "vote_average": film.vote_average,
        }
        for entry, film in entries
        if entry.rating is not None and film is not None and film.popularity is not None
    ]

    ratings = [e.rating for e, _ in entries if e.rating is not None]
    runtimes = [f.runtime for f in films if f.runtime]
    vote_averages = [f.vote_average for f in films if f.vote_average]

    favorites = [{"title": e.title, "year": e.year} for e, _ in entries if e.is_favorite]

    return {
        "totals": {
            "films": len({(e.title, e.year) for e, _ in entries}),
            "entries": len(entries),
            "hours_watched": round(sum(runtimes) / 60) if runtimes else None,
            "avg_user_rating": round(mean(ratings), 2) if ratings else None,
            "avg_crowd_rating": round(mean(vote_averages), 2) if vote_averages else None,
        },
        "countries": [
            {"country": country, "count": count} for country, count in countries.most_common()
        ],
        "genres": [{"genre": genre, "count": count} for genre, count in genres.most_common(12)],
        "timeline": [{"month": month, "count": by_month[month]} for month in sorted(by_month)],
        "daily": [{"date": day, "count": by_day[day]} for day in sorted(by_day)],
        "rating_vs_popularity": scatter,
        "favorites": favorites,
    }
