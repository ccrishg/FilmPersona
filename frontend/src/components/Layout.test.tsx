import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Layout } from "./Layout";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout header nav", () => {
  it("links to How it works", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
  });

  it("shows Recommendations as a disabled, non-navigating placeholder", () => {
    renderLayout();

    expect(
      screen.queryByRole("link", { name: /Recommendations/ }),
    ).not.toBeInTheDocument();
    const placeholder = screen.getByText("Recommendations");
    expect(placeholder.closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Soon")).toBeInTheDocument();
  });
});
