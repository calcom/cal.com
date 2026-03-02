import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@coss/ui/icons", () => ({
  CheckIcon: () => <span data-testid="check-icon" />,
}));

import { DateTargetSelector } from "./DateTargetSelector";

describe("DateTargetSelector", () => {
  it("should render the trigger button", () => {
    const onChange = vi.fn();
    render(<DateTargetSelector value="startTime" onChange={onChange} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should show screen reader text for selected option", () => {
    const onChange = vi.fn();
    render(<DateTargetSelector value="startTime" onChange={onChange} />);
    expect(screen.getByText("booking_time_option")).toBeInTheDocument();
  });

  it("should show created at screen reader text when value is createdAt", () => {
    const onChange = vi.fn();
    render(<DateTargetSelector value="createdAt" onChange={onChange} />);
    expect(screen.getByText("created_at_option")).toBeInTheDocument();
  });
});
