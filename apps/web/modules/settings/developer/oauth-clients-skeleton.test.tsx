import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("OAuthClientsSkeleton", async () => {
  const { OAuthClientsSkeleton } = await import("./oauth-clients-skeleton");
  it("should render without crashing", () => {
    const { container } = render(<OAuthClientsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render skeleton text elements", () => {
    const { getAllByTestId } = render(<OAuthClientsSkeleton />);
    expect(getAllByTestId("skeleton-text").length).toBeGreaterThan(3);
  });

  it("should render 3 skeleton client rows", () => {
    const { container } = render(<OAuthClientsSkeleton />);
    const rows = container.querySelectorAll(".flex.items-center.justify-between.p-4");
    expect(rows.length).toBe(3);
  });
});
