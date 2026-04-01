import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@coss/ui/components/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardFrame: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-frame" {...props}>
      {children}
    </div>
  ),
  CardFrameDescription: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-frame-description" {...props}>
      {children}
    </div>
  ),
  CardFrameFooter: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-frame-footer" {...props}>
      {children}
    </div>
  ),
  CardFrameHeader: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-frame-header" {...props}>
      {children}
    </div>
  ),
  CardFrameTitle: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-frame-title" {...props}>
      {children}
    </div>
  ),
  CardPanel: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="card-panel" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="skeleton" {...props} />,
}));

vi.mock("@coss/ui/shared/app-header", () => ({
  AppHeader: ({ children, ...props }: { children: React.ReactNode }) => (
    <header data-testid="app-header" {...props}>
      {children}
    </header>
  ),
  AppHeaderContent: ({ title, children, ...props }: { title: string; children?: React.ReactNode }) => (
    <div data-testid="app-header-content" data-title={title} {...props}>
      {children}
    </div>
  ),
  AppHeaderDescription: ({ children, ...props }: { children: React.ReactNode }) => (
    <p data-testid="app-header-description" {...props}>
      {children}
    </p>
  ),
}));

describe("AppearanceSkeleton", async () => {
  const { SkeletonLoader } = await import("./appearance-skeleton");

  it("should render without crashing", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("should render AppHeaderContent with appearance title", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("app-header-content")).toHaveAttribute("data-title", "appearance");
  });

  it("should render skeleton elements", () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
  });

  it("should render card frame with footer", () => {
    render(<SkeletonLoader />);
    expect(screen.getByTestId("card-frame")).toBeInTheDocument();
    expect(screen.getByTestId("card-frame-footer")).toBeInTheDocument();
  });
});
