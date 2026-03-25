import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveUserBreakdownSkeleton } from "./ActiveUserBreakdownSkeleton";

describe("ActiveUserBreakdownSkeleton", () => {
  it("should render without crashing", () => {
    const { container } = render(<ActiveUserBreakdownSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render the active_users_billing heading", () => {
    render(<ActiveUserBreakdownSkeleton />);
    expect(screen.getByText("active_users_billing")).toBeInTheDocument();
  });

  it("should render table structure", () => {
    const { container } = render(<ActiveUserBreakdownSkeleton />);
    expect(container.querySelectorAll('[class*="border-b"]').length).toBeGreaterThan(3);
  });
});
