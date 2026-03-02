import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="settings-header" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}));

describe("GeneralSkeleton", async () => {
  const { SkeletonLoader } = await import("./general-skeleton");
  it("should render without crashing", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toBeInTheDocument();
  });

  it("should render SettingsHeader with general title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toHaveAttribute("data-title", "general");
  });

  it("should render multiple skeleton elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
