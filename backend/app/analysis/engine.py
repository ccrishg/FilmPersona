"""Personality engine entry point: enriched history -> full profile result JSON."""

from dataclasses import asdict
from typing import Any

from app.analysis.personality import config
from app.analysis.personality.archetypes import get_archetype
from app.analysis.personality.axes import compute_axes, personality_code
from app.analysis.personality.features import EnrichedEntry, extract_features
from app.analysis.stats import compute_stats


def build_profile(entries: list[EnrichedEntry]) -> dict[str, Any]:
    features = extract_features(entries)
    axes = compute_axes(features)
    code = personality_code(axes)
    archetype = get_archetype(code)

    return {
        "model_version": config.MODEL_VERSION,
        "personality": {
            "code": code,
            "archetype": {
                "name": archetype.name,
                "tagline": archetype.tagline,
                "description": archetype.description,
            },
            "axes": [
                {
                    "key": axis.key,
                    "label": axis.label,
                    "score": axis.score,
                    "letter": axis.letter,
                    "low": {"letter": axis.low_pole, "name": axis.low_name},
                    "high": {"letter": axis.high_pole, "name": axis.high_name},
                    "explanation": axis.explanation,
                }
                for axis in axes
            ],
        },
        "features": asdict(features),
        "stats": compute_stats(entries),
    }
