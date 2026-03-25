import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({ APP_NAME: "Cal.com" }));

vi.mock("@coss/ui/shared/app-header", () => ({
  AppHeader: ({ children }: { children: React.ReactNode }) => (
    <header data-testid="app-header">{children}</header>
  ),
  AppHeaderContent: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="app-header-content" data-title={title}>
      {children}
    </div>
  ),
  AppHeaderDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@coss/ui/components/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className, ...props }: { className?: string; "data-testid"?: string }) => (
    <div data-testid={props["data-testid"] || "skeleton-text"} className={className} />
  ),
}));

vi.mock("@coss/ui/shared/list-item", () => ({
  ListItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemBadges: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ApiKeysSkeleton", async () => {
  const { SkeletonLoader } = await import("./api-keys-skeleton");
  it("should render without crashing", () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render AppHeader with api_keys title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header-content")).toHaveAttribute("data-title", "api_keys");
  });

  it("should render skeleton text elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThanOrEqual(2);
  });
});
