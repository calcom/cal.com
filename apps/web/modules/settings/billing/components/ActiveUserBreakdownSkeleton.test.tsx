import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
}));

describe("ActiveUserBreakdownSkeleton", async () => {
  const { ActiveUserBreakdownSkeleton } = await import("./ActiveUserBreakdownSkeleton");
  it("should render without crashing", () => {
    const { container } = render(<ActiveUserBreakdownSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render the active_users_billing heading", () => {
    render(<ActiveUserBreakdownSkeleton />);
    expect(screen.getByText("active_users_billing")).toBeInTheDocument();
  });

  it("should render multiple skeleton text elements", () => {
    const { getAllByTestId } = render(<ActiveUserBreakdownSkeleton />);
    expect(getAllByTestId("skeleton-text").length).toBeGreaterThan(5);
  });
});
