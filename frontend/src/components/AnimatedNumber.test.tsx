import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "./AnimatedNumber";

// jsdom has no IntersectionObserver, so the component's own guard skips
// straight to the final value — no fake timers or rAF flushing needed here.

describe("AnimatedNumber", () => {
  it("shows the final integer value directly", () => {
    render(<AnimatedNumber value={88} />);

    expect(screen.getByText("88")).toBeInTheDocument();
  });

  it("formats decimals", () => {
    render(<AnimatedNumber value={4} decimals={1} />);

    expect(screen.getByText("4.0")).toBeInTheDocument();
  });
});
