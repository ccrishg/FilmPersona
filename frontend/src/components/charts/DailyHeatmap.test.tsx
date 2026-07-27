import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailyHeatmap } from "./DailyHeatmap";

describe("DailyHeatmap", () => {
  it("renders the weekday labels and the intensity legend", () => {
    render(
      <DailyHeatmap
        daily={[
          { date: "2026-05-10", count: 1 },
          { date: "2026-06-02", count: 3 },
        ]}
      />,
    );

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("fewer")).toBeInTheDocument();
    expect(screen.getByText("more")).toBeInTheDocument();
  });

  it("renders nothing when there is no dated data", () => {
    const { container } = render(<DailyHeatmap daily={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
