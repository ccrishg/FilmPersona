import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToggleGroup } from "./ToggleGroup";

describe("ToggleGroup", () => {
  it("marks the active option as pressed and calls onChange for the other", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleGroup
        ariaLabel="test view"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Option A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Option B" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
