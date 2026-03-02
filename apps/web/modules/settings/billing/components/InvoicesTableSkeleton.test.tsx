import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-text" className={className} />
  ),
}));

vi.mock("@calcom/ui/components/card", () => ({
  PanelCard: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="panel-card" data-title={title}>
      {children}
    </div>
  ),
}));

describe("InvoicesTableSkeleton", async () => {
  const { InvoicesTableSkeleton } = await import("./InvoicesTableSkeleton");
  it("should render without crashing", () => {
    const { container } = render(<InvoicesTableSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render inside a PanelCard with invoices title", () => {
    const { getByTestId } = render(<InvoicesTableSkeleton />);
    expect(getByTestId("panel-card")).toHaveAttribute("data-title", "invoices");
  });

  it("should render multiple skeleton rows", () => {
    const { getAllByTestId } = render(<InvoicesTableSkeleton />);
    expect(getAllByTestId("skeleton-text").length).toBeGreaterThan(10);
  });
});
