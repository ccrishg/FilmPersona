import type { Axis, Personality, ProfileFeatures } from "../api/types";

// A fixed 6-film "demo diet" that walks /how-it-works through the real
// pipeline. Every number here — features, axis scores, the final code — was
// computed by running the actual model (backend/app/analysis/personality/)
// once, not invented. backend/tests/test_demo_diet.py reconstructs this exact
// diet and asserts these exact numbers; if the model changes, that test fails
// and tells you to regenerate this file.
//
// Regenerate with: uv run python <one-off script>, see backend/tests/test_demo_diet.py
// for the diet definition and app/analysis/personality/{features,axes}.py for
// the functions to call.

export interface DemoFilm {
  title: string;
  year: number;
  rating: number; // 0.5-5.0 stars
  isRewatch: boolean;
  isFavorite: boolean;
  // Enrich-stage fields — absent from what Letterboxd itself publishes.
  countries: string[];
  genres: string[];
  language: string;
  popularity: number;
}

export const DEMO_FILMS: DemoFilm[] = [
  {
    title: "Parasite",
    year: 2019,
    rating: 5.0,
    isRewatch: false,
    isFavorite: true,
    countries: ["KR"],
    genres: ["Comedy", "Thriller", "Drama"],
    language: "ko",
    popularity: 87.4,
  },
  {
    title: "Barbie",
    year: 2023,
    rating: 3.5,
    isRewatch: false,
    isFavorite: false,
    countries: ["US"],
    genres: ["Comedy", "Adventure", "Fantasy"],
    language: "en",
    popularity: 180.2,
  },
  {
    title: "My Neighbor Totoro",
    year: 1988,
    rating: 4.5,
    isRewatch: true,
    isFavorite: false,
    countries: ["JP"],
    genres: ["Animation", "Family", "Fantasy"],
    language: "ja",
    popularity: 122.6,
  },
  {
    title: "Amélie",
    year: 2001,
    rating: 4.0,
    isRewatch: false,
    isFavorite: false,
    countries: ["FR"],
    genres: ["Comedy", "Romance"],
    language: "fr",
    popularity: 45.3,
  },
  {
    title: "Mad Max: Fury Road",
    year: 2015,
    rating: 4.0,
    isRewatch: false,
    isFavorite: false,
    countries: ["AU", "US"],
    genres: ["Action", "Adventure", "Science Fiction"],
    language: "en",
    popularity: 151.9,
  },
  {
    title: "Aftersun",
    year: 2022,
    rating: 4.5,
    isRewatch: false,
    isFavorite: false,
    countries: ["GB", "US"],
    genres: ["Drama"],
    language: "en",
    popularity: 24.8,
  },
];

export const DEMO_AXES: Axis[] = [
  {
    key: "popularity",
    label: "What you reach for",
    score: 25,
    letter: "M",
    low: { letter: "M", name: "Mainstream" },
    high: { letter: "A", name: "Arthouse" },
    explanation:
      "The median film you watch sits at TMDB popularity 105, and 67% of your films are big-audience titles.",
  },
  {
    key: "scope",
    label: "Where your films come from",
    score: 59,
    letter: "G",
    low: { letter: "L", name: "Local" },
    high: { letter: "G", name: "Global" },
    explanation:
      "Your films come from 6 countries and 50% are in a language other than English.",
  },
  {
    key: "habit",
    label: "How you explore",
    score: 70,
    letter: "E",
    low: { letter: "F", name: "Faithful" },
    high: { letter: "E", name: "Explorer" },
    explanation:
      "Genre spread 96/100, with your top 5 directors accounting for 83% of your watches and a 17% rewatch rate.",
  },
  {
    key: "judgment",
    label: "How you rate",
    score: 31,
    letter: "H",
    low: { letter: "H", name: "Enthusiast" },
    high: { letter: "C", name: "Critic" },
    explanation:
      "You rate films 0.8 points above the TMDB crowd average (on a 10-point scale).",
  },
];

export const DEMO_CODE = "MGEH";

export const DEMO_ARCHETYPE = {
  name: "The Popcorn Polyglot",
  tagline: "Subtitles on, expectations off.",
  description:
    "You'll watch anything fun from anywhere. Genre cinema in five languages, rated " +
    "with the enthusiasm of someone who just enjoys movies enormously.",
};

// Same FeatureSet the model actually computed for this diet — feeds the
// headline-number chips on each axis bar, exactly like a real profile.
export const DEMO_FEATURES: ProfileFeatures = {
  n_films: 6,
  median_popularity: 105.0,
  pct_high_popularity: 0.6666666666666666,
  country_diversity: 0.6710360461917368,
  pct_non_english: 0.5,
  n_countries: 6,
  genre_diversity: 0.9602550098461561,
  director_concentration: 0.8333333333333334,
  pct_rewatch: 0.16666666666666666,
  avg_user_rating: 4.25,
  rating_stddev: 0.5244044240850758,
  rating_delta: 0.7666666666666667,
};

// The full Personality object — lets the Score step reuse the real
// <PersonalityCard>, the exact component a live profile renders.
export const DEMO_PERSONALITY: Personality = {
  code: DEMO_CODE,
  archetype: DEMO_ARCHETYPE,
  axes: DEMO_AXES,
};

// Mirrors PersonalityCard's chipsFor() for these exact feature values, so the
// Analyze step's AxisBar chips look identical to the ones on a real profile.
export const DEMO_CHIPS: Record<string, string[]> = {
  popularity: ["median popularity 105", "67% blockbusters"],
  scope: ["50% non-English"],
  habit: ["96% genre spread", "17% rewatches"],
  judgment: ["+0.4★ vs crowd"],
};
