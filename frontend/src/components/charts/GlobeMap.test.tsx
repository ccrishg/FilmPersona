import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobeMap } from "./GlobeMap";

describe("GlobeMap", () => {
  it("renders the globe and the intensity legend without crashing", () => {
    render(
      <GlobeMap
        data={[
          { country: "KR", count: 3 },
          { country: "FR", count: 1 },
        ]}
        totalFilms={10}
      />,
    );

    expect(
      screen.getByRole("figure", {
        name: /films by country of production, on a globe/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("none")).toBeInTheDocument();
    expect(screen.getByText("fewer")).toBeInTheDocument();
    expect(screen.getByText("more")).toBeInTheDocument();
  });
});
