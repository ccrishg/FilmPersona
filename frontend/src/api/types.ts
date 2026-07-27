// Mirror of the backend API contract (app/api/analyses.py + analysis/engine.py).

export type AnalysisStatus = "pending" | "running" | "done" | "failed";
export type AnalysisStage = "ingest" | "enrich" | "analyze";

export type ErrorCode =
  | "PROFILE_PRIVATE"
  | "PROFILE_NOT_FOUND"
  | "SCRAPE_BLOCKED"
  | "EMPTY_HISTORY"
  | "INVALID_EXPORT"
  | "INTERNAL_ERROR";

export interface AxisPole {
  letter: string;
  name: string;
}

export interface Axis {
  key: string;
  label: string;
  score: number; // 0-100, toward the `high` pole
  letter: string;
  low: AxisPole;
  high: AxisPole;
  explanation: string;
}

export interface Personality {
  code: string;
  archetype: { name: string; tagline: string; description: string };
  axes: Axis[];
}

export interface ProfileStats {
  totals: {
    films: number;
    entries: number;
    hours_watched: number | null;
    avg_user_rating: number | null;
    avg_crowd_rating: number | null;
  };
  countries: { country: string; count: number }[];
  genres: { genre: string; count: number }[];
  timeline: { month: string; count: number }[];
  daily?: { date: string; count: number }[]; // absent on profiles computed before this field existed
  rating_vs_popularity: {
    title: string;
    year: number | null;
    user_rating: number;
    popularity: number;
    vote_average: number | null;
  }[];
  favorites: { title: string; year: number | null }[];
}

// Mirror of FeatureSet (backend/app/analysis/personality/features.py).
export interface ProfileFeatures {
  n_films: number;
  median_popularity: number | null;
  pct_high_popularity: number | null;
  country_diversity: number;
  pct_non_english: number | null;
  n_countries: number;
  genre_diversity: number;
  director_concentration: number;
  pct_rewatch: number;
  avg_user_rating: number | null;
  rating_stddev: number | null;
  rating_delta: number | null;
}

export interface ProfileResult {
  model_version: string;
  personality: Personality;
  features?: ProfileFeatures;
  stats: ProfileStats;
}

export interface Analysis {
  id: string;
  source: "scrape" | "csv_import";
  username: string | null;
  status: AnalysisStatus;
  stage: AnalysisStage | null;
  error_code: ErrorCode | null;
  result?: ProfileResult;
}
