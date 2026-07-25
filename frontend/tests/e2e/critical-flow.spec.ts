import { expect, test } from "@playwright/test";

/**
 * Critical flow: user types a username -> sees staged progress -> sees their profile.
 * The backend API is mocked at the network layer, so this exercises the whole
 * frontend (routing, polling, charts, map) without scraping anyone.
 */

const RESULT = {
  model_version: "v1",
  personality: {
    code: "AGEC",
    archetype: {
      name: "The World-Cinema Critic",
      tagline: "The full map, the highest bar.",
      description: "Maximum range, maximum rigor.",
    },
    axes: [
      {
        key: "popularity",
        label: "What you reach for",
        score: 82,
        letter: "A",
        low: { letter: "M", name: "Mainstream" },
        high: { letter: "A", name: "Arthouse" },
        explanation: "The median film you watch sits at TMDB popularity 4.",
      },
      {
        key: "scope",
        label: "Where your films come from",
        score: 75,
        letter: "G",
        low: { letter: "L", name: "Local" },
        high: { letter: "G", name: "Global" },
        explanation: "Your films come from 12 countries.",
      },
      {
        key: "habit",
        label: "How you explore",
        score: 68,
        letter: "E",
        low: { letter: "F", name: "Faithful" },
        high: { letter: "E", name: "Explorer" },
        explanation: "Genre spread 70/100.",
      },
      {
        key: "judgment",
        label: "How you rate",
        score: 61,
        letter: "C",
        low: { letter: "H", name: "Enthusiast" },
        high: { letter: "C", name: "Critic" },
        explanation: "You rate films 0.4 points below the crowd.",
      },
    ],
  },
  features: {
    n_films: 2,
    median_popularity: 66,
    pct_high_popularity: 0.5,
    country_diversity: 0.6,
    pct_non_english: 0.5,
    n_countries: 2,
    genre_diversity: 0.7,
    director_concentration: 1,
    pct_rewatch: 0,
    avg_user_rating: 3.75,
    rating_stddev: 1.06,
    rating_delta: -0.4,
  },
  stats: {
    totals: {
      films: 2,
      entries: 2,
      hours_watched: 4,
      avg_user_rating: 3.75,
      avg_crowd_rating: 8.1,
    },
    countries: [
      { country: "KR", count: 1 },
      { country: "FR", count: 1 },
    ],
    genres: [
      { genre: "Thriller", count: 1 },
      { genre: "Drama", count: 1 },
    ],
    timeline: [
      { month: "2026-05", count: 1 },
      { month: "2026-06", count: 1 },
    ],
    rating_vs_popularity: [
      { title: "Parasite", year: 2019, user_rating: 4.5, popularity: 87, vote_average: 8.5 },
      { title: "Amélie", year: 2001, user_rating: 3.0, popularity: 45, vote_average: 7.7 },
    ],
    favorites: [{ title: "Parasite", year: 2019 }],
  },
};

test("username to profile", async ({ page }) => {
  // The mock stays in "running" until the test has verified the progress UI.
  let finished = false;

  await page.route("**/api/analyses", (route) =>
    route.fulfill({ status: 202, json: { id: "e2e-1", status: "pending" } }),
  );
  await page.route("**/api/analyses/e2e-1", (route) => {
    const base = { id: "e2e-1", source: "scrape", username: "dave", error_code: null };
    if (!finished) {
      return route.fulfill({ json: { ...base, status: "running", stage: "enrich" } });
    }
    return route.fulfill({ json: { ...base, status: "done", stage: null, result: RESULT } });
  });

  await page.goto("/");
  await page.getByLabel("Letterboxd username").fill("dave");
  await page.getByRole("button", { name: "Analyze" }).click();

  // Progress screen with the enrich stage active.
  await expect(page.getByText("Analyzing @dave…")).toBeVisible();
  await expect(page.getByText("Enriching films with TMDB metadata")).toBeVisible();
  finished = true;

  // Profile renders after polling flips to done.
  await expect(page.getByText("AGEC")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The World-Cinema Critic" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Where your films come from" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your genres" })).toBeVisible();
  await expect(page.getByText("50% non-English")).toBeVisible();
  await expect(page.getByText("Parasite (2019)")).toBeVisible();
});

test("private profile offers the ZIP fallback", async ({ page }) => {
  await page.route("**/api/analyses", (route) =>
    route.fulfill({ status: 202, json: { id: "e2e-2", status: "pending" } }),
  );
  await page.route("**/api/analyses/e2e-2", (route) =>
    route.fulfill({
      json: {
        id: "e2e-2",
        source: "scrape",
        username: "secret",
        status: "failed",
        stage: null,
        error_code: "PROFILE_PRIVATE",
      },
    }),
  );

  await page.goto("/");
  await page.getByLabel("Letterboxd username").fill("secret");
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByText(/profile is private/)).toBeVisible();
  await expect(page.getByText("Upload your Letterboxd export ZIP")).toBeVisible();
});
