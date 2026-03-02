import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SkeletonButton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-button" className={className} />
  ),
}));

describe("BillingCreditsSkeleton", async () => {
  const { BillingCreditsSkeleton } = await import("./BillingCreditsSkeleton");
  it("should render without crashing", () => {
    const { container } = render(<BillingCreditsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render multiple skeleton text elements", () => {
    const { getAllByTestId } = render(<BillingCreditsSkeleton />);
    expect(getAllByTestId("skeleton-text").length).toBeGreaterThan(3);
  });

  it("should render skeleton buttons for buy and download actions", () => {
    const { getAllByTestId } = render(<BillingCreditsSkeleton />);
    expect(getAllByTestId("skeleton-button").length).toBeGreaterThanOrEqual(2);
  });
});
