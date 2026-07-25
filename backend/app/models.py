import enum
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class AnalysisStatus(enum.StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class AnalysisStage(enum.StrEnum):
    INGEST = "ingest"
    ENRICH = "enrich"
    ANALYZE = "analyze"


class AnalysisSource(enum.StrEnum):
    SCRAPE = "scrape"
    CSV_IMPORT = "csv_import"


class ErrorCode(enum.StrEnum):
    PROFILE_PRIVATE = "PROFILE_PRIVATE"
    PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND"
    EMPTY_HISTORY = "EMPTY_HISTORY"
    INVALID_EXPORT = "INVALID_EXPORT"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class Analysis(Base):
    """One analysis run: a username (scrape) or an uploaded export (csv_import)."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    source: Mapped[AnalysisSource] = mapped_column(Enum(AnalysisSource))
    username: Mapped[str | None] = mapped_column(String(100), index=True)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus), default=AnalysisStatus.PENDING, index=True
    )
    stage: Mapped[AnalysisStage | None] = mapped_column(Enum(AnalysisStage))
    error_code: Mapped[ErrorCode | None] = mapped_column(Enum(ErrorCode))
    error_detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    entries: Mapped[list["WatchedEntry"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )
    profile: Mapped["Profile | None"] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", uselist=False
    )


class Film(Base):
    """Persistent cache of TMDB-enriched films, shared across analyses."""

    __tablename__ = "films"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    # Letterboxd URL slug (e.g. "parasite-2019") — the natural join key from ingestion.
    letterboxd_slug: Mapped[str | None] = mapped_column(String(300), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    year: Mapped[int | None] = mapped_column(Integer)
    directors: Mapped[list[str] | None] = mapped_column(JSON)
    genres: Mapped[list[str] | None] = mapped_column(JSON)
    production_countries: Mapped[list[str] | None] = mapped_column(JSON)  # ISO 3166-1 alpha-2
    original_language: Mapped[str | None] = mapped_column(String(10))
    popularity: Mapped[float | None] = mapped_column(Float)
    vote_average: Mapped[float | None] = mapped_column(Float)
    runtime: Mapped[int | None] = mapped_column(Integer)
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    entries: Mapped[list["WatchedEntry"]] = relationship(back_populates="film")


class WatchedEntry(Base):
    """A normalized 'user watched film' record, whatever the ingestion source."""

    __tablename__ = "watched_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    film_id: Mapped[int | None] = mapped_column(ForeignKey("films.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    year: Mapped[int | None] = mapped_column(Integer)
    letterboxd_slug: Mapped[str | None] = mapped_column(String(300))
    watched_on: Mapped[date | None] = mapped_column(Date)
    rating: Mapped[float | None] = mapped_column(Float)  # 0.5-5.0 stars
    is_rewatch: Mapped[bool] = mapped_column(default=False)
    is_favorite: Mapped[bool] = mapped_column(default=False)

    analysis: Mapped[Analysis] = relationship(back_populates="entries")
    film: Mapped[Film | None] = relationship(back_populates="entries")


class Profile(Base):
    """The computed personality profile + stats for one analysis."""

    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, index=True
    )
    model_version: Mapped[str] = mapped_column(String(20))
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    analysis: Mapped[Analysis] = relationship(back_populates="profile")
