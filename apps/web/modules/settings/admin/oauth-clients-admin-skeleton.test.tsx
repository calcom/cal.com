import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton-text" />,
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("OAuthClientsAdminSkeleton", async () => {
  const { OAuthClientsAdminSkeleton } = await import("./oauth-clients-admin-skeleton");
  it("should render without crashing", () => {
    render(<OAuthClientsAdminSkeleton />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
  });

  it("should render 3 sections with skeleton rows", () => {
    const { container } = render(<OAuthClientsAdminSkeleton />);
    const sections = container.querySelectorAll(".space-y-3");
    expect(sections.length).toBe(3);
  });

  it("should render skeleton text elements in each section", () => {
    render(<OAuthClientsAdminSkeleton />);
    const skeletonTexts = screen.getAllByTestId("skeleton-text");
    expect(skeletonTexts.length).toBeGreaterThanOrEqual(3);
  });
});
