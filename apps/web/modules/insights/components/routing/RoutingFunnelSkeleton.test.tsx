import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}));

import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

describe("RoutingFunnelSkeleton", () => {
  it("should render skeleton elements", () => {
    const { container } = render(<RoutingFunnelSkeleton />);
    expect(container.querySelector(".relative.h-\\[300px\\]")).toBeInTheDocument();
  });

  it("should render Y-axis skeleton items", () => {
    const { getAllByTestId } = render(<RoutingFunnelSkeleton />);
    const skeletons = getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render legend area with three colored boxes", () => {
    const { container } = render(<RoutingFunnelSkeleton />);
    const colorBoxes = container.querySelectorAll(".h-3.w-3.rounded-sm");
    expect(colorBoxes).toHaveLength(3);
  });
});
