import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Personality } from "../api/types";
import { PersonalityCard } from "./PersonalityCard";

const personality: Personality = {
  code: "AGEC",
  archetype: {
    name: "The World-Cinema Critic",
    tagline: "The full map, the highest bar.",
    description: "Maximum range, maximum rigor.",
  },
  axes: (["popularity", "scope", "habit", "judgment"] as const).map(
    (key, i) => ({
      key,
      label: key,
      score: 70 + i,
      letter: "AGEC"[i],
      low: { letter: "MLFH"[i], name: `low-${key}` },
      high: { letter: "AGEC"[i], name: `high-${key}` },
      explanation: `because ${key}`,
    }),
  ),
};

describe("PersonalityCard", () => {
  it("shows the 4-letter code and archetype", () => {
    render(<PersonalityCard personality={personality} />);

    expect(screen.getByText("#AGEC")).toBeInTheDocument();
    expect(screen.getByText("The World-Cinema Critic")).toBeInTheDocument();
    expect(
      screen.getByText("The full map, the highest bar."),
    ).toBeInTheDocument();
  });

  it("renders one bar per axis", () => {
    render(<PersonalityCard personality={personality} />);

    for (const key of ["popularity", "scope", "habit", "judgment"]) {
      expect(screen.getByTestId(`axis-marker-${key}`)).toBeInTheDocument();
    }
  });
});
