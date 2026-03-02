import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/settings/SectionBottomActions", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="section-bottom">{children}</div>
  ),
}));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="settings-header" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonButton: () => <div data-testid="skeleton-button" />,
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SkeletonText: () => <div data-testid="skeleton-text" />,
}));

describe("AppearanceSkeleton", async () => {
  const { SkeletonLoader } = await import("./appearance-skeleton");
  it("should render without crashing", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toBeInTheDocument();
  });

  it("should render SettingsHeader with appearance title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toHaveAttribute("data-title", "appearance");
  });

  it("should render skeleton text elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
  });

  it("should render skeleton button", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("skeleton-button")).toBeInTheDocument();
  });
});
