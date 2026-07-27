"""Tunable knobs of the personality model, versioned.

Iterating on the model later means bumping MODEL_VERSION and adjusting these
values (or adding new features) — the pipeline and API contract stay unchanged.
Every stored Profile records the MODEL_VERSION that produced it.

MODEL_VERSION also versions the shape of the `result` JSON (personality +
stats), not just the scoring weights: bump it whenever `stats` gains/changes a
field, so stale cached analyses (see the reuse query in app/api/analyses.py)
get recomputed instead of serving an old shape to a newer frontend.

v2: adds `stats.daily` (per-day watch counts for the GitHub-style heatmap).
"""

MODEL_VERSION = "v2"

# --- Feature thresholds -----------------------------------------------------

# TMDB popularity above this counts as a "high popularity" (blockbuster-ish) film.
POPULARITY_HIGH = 50.0

# Entropy normalization caps: diversity saturates once you span this many
# distinct countries/genres (log-normalized Shannon entropy).
COUNTRY_DIVERSITY_CAP = 12
GENRE_DIVERSITY_CAP = 10

# Directors counted as the "core" of a filmography for concentration.
TOP_DIRECTORS = 5

# --- Axis score weights (each axis blends features into a 0-100 score) -------

# Popularity axis (0 = Mainstream, 100 = Arthouse)
W_POPULARITY_MEDIAN = 0.6  # log-scaled median popularity
W_POPULARITY_SHARE = 0.4  # share of low-popularity films
# log10(popularity) range mapped to the score: 10^0=1 (arthouse) .. 10^2.5≈316 (mainstream)
LOG_POP_MAX = 2.5

# Scope axis (0 = Local, 100 = Global)
W_COUNTRY_ENTROPY = 0.55
W_NON_ENGLISH = 0.45

# Habit axis (0 = Faithful, 100 = Explorer)
W_GENRE_ENTROPY = 0.5
W_DIRECTOR_SPREAD = 0.3
W_NO_REWATCH = 0.2

# Judgment axis (0 = Hyped, 100 = Critic)
# rating_delta = mean(user_rating_on_10 - tmdb_vote_average); ±DELTA_SPAN maps to 0/100.
DELTA_SPAN = 2.0
