import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({ APP_NAME: "Cal.com" }));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="settings-header" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton-text" />,
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SkeletonButton: () => <div data-testid="skeleton-button" />,
  SkeletonAvatar: () => <div data-testid="skeleton-avatar" />,
}));

describe("ProfileSkeleton", async () => {
  const { SkeletonLoader } = await import("./profile-skeleton");
  it("should render without crashing", () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render SettingsHeader with profile title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toHaveAttribute("data-title", "profile");
  });

  it("should render skeleton avatar", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("skeleton-avatar")).toBeInTheDocument();
  });

  it("should render multiple skeleton text elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThanOrEqual(3);
  });
});
