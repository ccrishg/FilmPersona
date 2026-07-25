import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Axis } from "../api/types";
import { AxisBar } from "./AxisBar";

const axis: Axis = {
  key: "popularity",
  label: "What you reach for",
  score: 78,
  letter: "A",
  low: { letter: "M", name: "Mainstream" },
  high: { letter: "A", name: "Arthouse" },
  explanation: "The median film you watch sits at TMDB popularity 4.",
};

describe("AxisBar", () => {
  it("shows both poles and the explanation", () => {
    render(<AxisBar axis={axis} />);

    expect(screen.getByText("Mainstream")).toBeInTheDocument();
    expect(screen.getByText("Arthouse")).toBeInTheDocument();
    expect(screen.getByText(/median film you watch/)).toBeInTheDocument();
  });

  it("places the marker at the score percentage", () => {
    render(<AxisBar axis={axis} />);

    expect(screen.getByTestId("axis-marker-popularity")).toHaveStyle({
      left: "78%",
    });
  });

  it("emphasizes the dominant pole", () => {
    render(<AxisBar axis={axis} />);

    expect(screen.getByText("Arthouse")).toHaveClass("font-semibold");
    expect(screen.getByText("Mainstream")).not.toHaveClass("font-semibold");
  });
});
