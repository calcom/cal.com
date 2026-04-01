import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  CardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}));

describe("GeneralSkeleton", async () => {
  const { SkeletonLoader } = await import("./general-skeleton");
  it("should render without crashing", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("should render AppHeader with general title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header-content")).toHaveAttribute("data-title", "general");
  });

  it("should render multiple skeleton elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should render settings toggle skeleton placeholders", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("settings-toggle-skeleton").length).toBe(4);
  });
});
