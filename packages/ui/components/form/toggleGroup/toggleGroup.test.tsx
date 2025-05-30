import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import { ToggleGroup } from "./ToggleGroup";

vi.mock("../../tooltip/Tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ToggleGroup Component", () => {
  const defaultOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2", tooltip: "Option 2 tooltip" },
    { value: "option3", label: "Option 3", disabled: true },
  ];

  test("renders all options correctly", () => {
    render(<ToggleGroup value="option1" onValueChange={vi.fn()} options={defaultOptions} />);

    // Verify all options are rendered
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  test("applies correct styling to selected and non-selected options", async () => {
    render(
      <ToggleGroup
        value="option1"
        onValueChange={vi.fn()}
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ]}
      />
    );

    // Get the selected and non-selected items
    const selectedOption = screen.getByTestId("toggle-group-item-option1");
    const nonSelectedOption = screen.getByTestId("toggle-group-item-option2");

    // Check aria-checked attribute (core of selection state)
    await expect(selectedOption).toHaveAttribute("aria-checked", "true");
    await expect(nonSelectedOption).toHaveAttribute("aria-checked", "false");

    // Check cursor style - selected should have cursor-default
    await expect(selectedOption).toHaveClass("cursor-default");
    await expect(nonSelectedOption).not.toHaveClass("cursor-default");

    // Check that the selected option has the expected Tailwind classes
    // This verifies the specific styling for selected state
    const selectedClassString = selectedOption.getAttribute("class");
    expect(selectedClassString).toContain("aria-checked:bg-default");
    expect(selectedClassString).toContain("aria-checked:border-subtle");
    expect(selectedClassString).toContain("aria-checked:shadow-");

    // Verify that non-selected has hover styling
    const nonSelectedClassString = nonSelectedOption.getAttribute("class");
    expect(nonSelectedClassString).toContain("[&[aria-checked='false']]:hover:text-emphasis");
  });

  test("calls onValueChange when clicking a non-selected option", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(<ToggleGroup value="option1" onValueChange={onValueChange} options={defaultOptions} />);

    // Click on a non-selected option
    await user.click(screen.getByTestId("toggle-group-item-option2"));

    expect(onValueChange).toHaveBeenCalledWith("option2");
  });

  test("does not call onValueChange when clicking the already selected option", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<ToggleGroup value="option1" onValueChange={handleChange} options={defaultOptions} />);

    // Click on the already selected option
    await user.click(screen.getByTestId("toggle-group-item-option1"));

    expect(handleChange).not.toHaveBeenCalled();
  });

  test("respects the disabled option state", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(<ToggleGroup value="option1" onValueChange={onValueChange} options={defaultOptions} />);

    // Click on a non-selected option
    await user.click(screen.getByTestId("toggle-group-item-option3"));

    // Verify handler was not called
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("renders in vertical orientation when specified", async () => {
    render(
      <ToggleGroup value="option1" onValueChange={vi.fn()} options={defaultOptions} orientation="vertical" />
    );

    // Check if the root has vertical class
    const root = screen.getByRole("group");
    await expect(root).toHaveClass("flex-col");
  });

  test("applies isFullWidth styling when specified", async () => {
    render(<ToggleGroup value="option1" onValueChange={vi.fn()} options={defaultOptions} isFullWidth />);

    const root = screen.getByRole("group");
    await expect(root).toHaveClass("w-full");
  });

  test("logs error when value is undefined", () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => void 0);
    // @ts-expect-error - Testing error handling when required value prop is missing
    render(<ToggleGroup onValueChange={vi.fn()} options={defaultOptions} />);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "ToggleGroup: 'value' prop is required. You may have mistakenly used 'defaultValue' instead."
    );
    consoleErrorMock.mockRestore();
  });
});
