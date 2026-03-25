import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className, ...props }: { className?: string }) => (
    <div data-slot="skeleton" data-testid="skeleton" className={className} {...props} />
  ),
}));

describe("BillingCreditsSkeleton", async () => {
  const { BillingCreditsSkeleton } = await import("./BillingCreditsSkeleton");
  it("should render without crashing", () => {
    const { container } = render(<BillingCreditsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render multiple skeleton elements", () => {
    const { getAllByTestId } = render(<BillingCreditsSkeleton />);
    expect(getAllByTestId("skeleton").length).toBeGreaterThan(3);
  });
});
