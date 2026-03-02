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
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ApiKeysSkeleton", async () => {
  const { SkeletonLoader } = await import("./api-keys-skeleton");
  it("should render without crashing", () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render SettingsHeader with api_keys title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("settings-header")).toHaveAttribute("data-title", "api_keys");
  });

  it("should render skeleton text elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThanOrEqual(2);
  });
});
