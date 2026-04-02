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
  CardFrame: ({ children, ...props }: { children: React.ReactNode; "data-testid"?: string }) => (
    <div data-testid={props["data-testid"]}>{children}</div>
  ),
  CardFrameFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className, ...props }: { className: string; "data-testid"?: string }) => (
    <div data-testid={props["data-testid"] ?? "skeleton"} className={className} />
  ),
}));

describe("ProfileSkeleton", async () => {
  const { SkeletonLoader } = await import("./profile-skeleton");

  it("should render without crashing", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("should render AppHeader with profile title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header-content")).toHaveAttribute("data-title", "profile");
  });

  it("should render skeleton avatar", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("skeleton-avatar")).toBeInTheDocument();
  });

  it("should render multiple skeleton elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should render danger zone skeleton", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("danger-zone-skeleton")).toBeInTheDocument();
  });
});
