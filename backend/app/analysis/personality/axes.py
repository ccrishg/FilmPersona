"""Axis scoring: FeatureSet -> four 0-100 axis scores -> 4-letter code.

Each axis runs between two poles; the score measures how far toward the second
pole the viewing history leans (0 = fully first pole, 100 = fully second pole).
"""

import math
from dataclasses import dataclass

from app.analysis.personality import config
from app.analysis.personality.features import FeatureSet


@dataclass(slots=True)
class AxisScore:
    key: str
    label: str
    low_pole: str  # letter at score < 50
    high_pole: str  # letter at score >= 50
    low_name: str
    high_name: str
    score: int  # 0-100
    explanation: str

    @property
    def letter(self) -> str:
        return self.high_pole if self.score >= 50 else self.low_pole


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _popularity_axis(f: FeatureSet) -> AxisScore:
    if f.median_popularity is None:
        toward_arthouse = 0.5
        explanation = "Not enough popularity data — defaulting to the middle."
    else:
        log_pop = math.log10(max(f.median_popularity, 1.0))
        from_median = 1.0 - _clamp01(log_pop / config.LOG_POP_MAX)
        from_share = 1.0 - (f.pct_high_popularity or 0.0)
        toward_arthouse = (
            config.W_POPULARITY_MEDIAN * from_median + config.W_POPULARITY_SHARE * from_share
        )
        explanation = (
            f"The median film you watch sits at TMDB popularity "
            f"{f.median_popularity:.0f}, and {(f.pct_high_popularity or 0) * 100:.0f}% "
            f"of your films are big-audience titles."
        )
    return AxisScore(
        key="popularity",
        label="What you reach for",
        low_pole="M",
        high_pole="A",
        low_name="Mainstream",
        high_name="Arthouse",
        score=round(toward_arthouse * 100),
        explanation=explanation,
    )


def _scope_axis(f: FeatureSet) -> AxisScore:
    toward_global = config.W_COUNTRY_ENTROPY * f.country_diversity + config.W_NON_ENGLISH * (
        f.pct_non_english or 0.0
    )
    explanation = (
        f"Your films come from {f.n_countries} countries and "
        f"{(f.pct_non_english or 0) * 100:.0f}% are in a language other than English."
    )
    return AxisScore(
        key="scope",
        label="Where your films come from",
        low_pole="L",
        high_pole="G",
        low_name="Local",
        high_name="Global",
        score=round(toward_global * 100),
        explanation=explanation,
    )


def _habit_axis(f: FeatureSet) -> AxisScore:
    toward_explorer = (
        config.W_GENRE_ENTROPY * f.genre_diversity
        + config.W_DIRECTOR_SPREAD * (1.0 - f.director_concentration)
        + config.W_NO_REWATCH * (1.0 - f.pct_rewatch)
    )
    explanation = (
        f"Genre spread {(f.genre_diversity * 100):.0f}/100, with your top "
        f"{config.TOP_DIRECTORS} directors accounting for "
        f"{f.director_concentration * 100:.0f}% of your watches and a "
        f"{f.pct_rewatch * 100:.0f}% rewatch rate."
    )
    return AxisScore(
        key="habit",
        label="How you explore",
        low_pole="F",
        high_pole="E",
        low_name="Faithful",
        high_name="Explorer",
        score=round(_clamp01(toward_explorer) * 100),
        explanation=explanation,
    )


def _judgment_axis(f: FeatureSet) -> AxisScore:
    if f.rating_delta is None:
        toward_critic = 0.5
        explanation = "Not enough ratings to compare against the crowd — middle of the road."
    else:
        toward_critic = _clamp01(0.5 - f.rating_delta / (2 * config.DELTA_SPAN))
        direction = "below" if f.rating_delta < 0 else "above"
        explanation = (
            f"You rate films {abs(f.rating_delta):.1f} points {direction} the "
            f"TMDB crowd average (on a 10-point scale)."
        )
    return AxisScore(
        key="judgment",
        label="How you rate",
        low_pole="H",
        high_pole="C",
        low_name="Enthusiast",
        high_name="Critic",
        score=round(toward_critic * 100),
        explanation=explanation,
    )


def compute_axes(features: FeatureSet) -> list[AxisScore]:
    return [
        _popularity_axis(features),
        _scope_axis(features),
        _habit_axis(features),
        _judgment_axis(features),
    ]


def personality_code(axes: list[AxisScore]) -> str:
    return "".join(axis.letter for axis in axes)
