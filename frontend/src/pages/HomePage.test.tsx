import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalysis } from "../api/client";
import { HomePage } from "./HomePage";

vi.mock("../api/client", () => ({
  createAnalysis: vi.fn(),
  importExportZip: vi.fn(),
  ApiError: class extends Error {},
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/analysis/:id" element={<p>analysis screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid username without calling the API", async () => {
    renderHome();

    await userEvent.type(
      screen.getByLabelText("Letterboxd username"),
      "not a user!!",
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /doesn't look like/,
    );
    expect(createAnalysis).not.toHaveBeenCalled();
  });

  it("submits a valid username and navigates to the analysis screen", async () => {
    vi.mocked(createAnalysis).mockResolvedValue({ id: "abc123" });
    renderHome();

    await userEvent.type(screen.getByLabelText("Letterboxd username"), "dave");
    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByText("analysis screen")).toBeInTheDocument();
    expect(createAnalysis).toHaveBeenCalledWith("dave");
  });
});
