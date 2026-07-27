import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HowItWorksPage } from "./HowItWorksPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <HowItWorksPage />
    </MemoryRouter>,
  );
}

// jsdom has no IntersectionObserver, so the page's own guard skips straight
// to the fully-decided state — no fake timers needed here.

describe("HowItWorksPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is framed as a worked example, not the user's own profile", () => {
    renderPage();

    expect(screen.getByText("Worked example")).toBeInTheDocument();
    expect(screen.getByText(/not your profile/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /run yours from the home page/i }),
    ).toHaveAttribute("href", "/");
  });

  it("shows Ingest with Letterboxd-native data only, and Enrich with the same films plus TMDB metadata", () => {
    renderPage();

    const ingest = within(screen.getByLabelText("ingest films"));
    expect(ingest.getByText("Parasite")).toBeInTheDocument();
    expect(ingest.getByText("★5.0")).toBeInTheDocument();
    expect(ingest.queryByText("ko")).not.toBeInTheDocument(); // no TMDB data yet

    const enrich = within(screen.getByLabelText("enrich films"));
    expect(enrich.getByText("Parasite")).toBeInTheDocument();
    expect(enrich.getByText("ko")).toBeInTheDocument(); // original_language
    expect(enrich.getByText("pop 87")).toBeInTheDocument();
  });

  it("settles all four axes and reveals the winning pole underline, without a scroll trigger in tests", async () => {
    renderPage();

    const axisScores = within(await screen.findByLabelText("axis scores"));
    for (const label of ["Mainstream", "Global", "Explorer", "Enthusiast"]) {
      expect(axisScores.getByText(label)).toHaveClass("underline");
    }
  });

  it("assembles the code and shows the real PersonalityCard for the resulting archetype", async () => {
    renderPage();

    const codeBox = await screen.findByLabelText("assembled code");
    expect(within(codeBox).getByText("M")).toBeInTheDocument();
    expect(within(codeBox).getByText("G")).toBeInTheDocument();
    expect(within(codeBox).getByText("E")).toBeInTheDocument();
    expect(within(codeBox).getByText("H")).toBeInTheDocument();

    const result = within(await screen.findByLabelText("resulting profile"));
    expect(result.getByText("The Popcorn Polyglot")).toBeInTheDocument();
    expect(result.getByLabelText("personality code MGEH")).toBeInTheDocument();
  });

  it("replays the sequence from a neutral state, then settles again", async () => {
    vi.useFakeTimers();
    renderPage();
    // The guard (no IntersectionObserver in jsdom) settles synchronously on mount —
    // no need to advance fake timers to reach the initial decided state.
    within(screen.getByLabelText("resulting profile")).getByText(
      "The Popcorn Polyglot",
    );

    fireEvent.click(screen.getByRole("button", { name: /Replay/ }));

    // Immediately after replay, no letters are revealed yet.
    const codeBox = screen.getByLabelText("assembled code");
    expect(within(codeBox).getAllByText("_")).toHaveLength(4);
    expect(
      screen.queryByLabelText("resulting profile"),
    ).not.toBeInTheDocument();

    // Each tick's effect schedules the next one, so flush after every single
    // stagger interval rather than jumping the fake clock in one big leap.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800); // matches STAGGER_MS in HowItWorksPage.tsx
      });
    }

    expect(within(codeBox).queryAllByText("_")).toHaveLength(0);
    expect(
      within(screen.getByLabelText("resulting profile")).getByText(
        "The Popcorn Polyglot",
      ),
    ).toBeInTheDocument();
  });

  it("lists all 16 archetypes inside the collapsed disclosure", () => {
    renderPage();

    expect(screen.getByText("See all 16 types")).toBeInTheDocument();
    expect(screen.getByText("AGEC")).toBeInTheDocument();
    expect(screen.getByText("The World-Cinema Critic")).toBeInTheDocument();
  });
});
