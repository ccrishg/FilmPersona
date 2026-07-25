"""Normalized ingestion contract.

Both ingestion sources (Letterboxd scraping and the CSV export upload) produce
`NormalizedEntry` records, so everything downstream (enrichment, analysis) is
agnostic of where the data came from.
"""

from dataclasses import dataclass, field
from datetime import date


@dataclass(slots=True)
class NormalizedEntry:
    """One 'user watched a film' event (or a dateless 'user has seen film' record)."""

    title: str
    year: int | None = None
    letterboxd_slug: str | None = None
    watched_on: date | None = None
    rating: float | None = None  # 0.5-5.0 stars
    is_rewatch: bool = False
    is_favorite: bool = False
    tmdb_id: int | None = None  # known directly from the RSS feed when available


@dataclass(slots=True)
class IngestResult:
    entries: list[NormalizedEntry] = field(default_factory=list)
    username: str | None = None
