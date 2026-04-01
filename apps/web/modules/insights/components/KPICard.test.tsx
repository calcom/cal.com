import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { KPICard } from "./KPICard";

vi.mock("@calcom/features/insights/lib", () => ({
  calculateDeltaType: vi.fn((delta: number) => {
    if (delta > 0) return "increase";
    if (delta < 0) return "decrease";
    return "unchanged";
  }),
  valueFormatter: vi.fn((value: number) => String(value)),
}));

describe("KPICard", () => {
  const defaultProps = {
    title: "Events Created",
    previousMetricData: { count: 100, deltaPrevious: 120 },
    previousDateRange: { startDate: "2025-01-01", endDate: "2025-01-31" },
  };

  it("should render title and count", () => {
    render(
      <TooltipProvider>
        <KPICard {...defaultProps} />
      </TooltipProvider>
    );
    expect(screen.getByText("Events Created")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should render delta percentage", () => {
    render(
      <TooltipProvider>
        <KPICard {...defaultProps} />
      </TooltipProvider>
    );
    expect(screen.getByText("120%")).toBeInTheDocument();
  });

  it("should show success badge for positive delta", () => {
    render(
      <TooltipProvider>
        <KPICard
          title="Test"
          previousMetricData={{ count: 50, deltaPrevious: 100 }}
          previousDateRange={{ startDate: "2025-01-01", endDate: "2025-01-31" }}
        />
      </TooltipProvider>
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("should show from_last_period text", () => {
    render(
      <TooltipProvider>
        <KPICard {...defaultProps} />
      </TooltipProvider>
    );
    expect(screen.getByText("from_last_period")).toBeInTheDocument();
  });

  it("should render info icon when tooltip is provided", () => {
    const { container } = render(
      <TooltipProvider>
        <KPICard {...defaultProps} tooltip="Test tooltip content" />
      </TooltipProvider>
    );
    const infoIcon = container.querySelector("svg");
    expect(infoIcon).toBeInTheDocument();
  });

  it("should not render info icon when tooltip is not provided", () => {
    const { container } = render(
      <TooltipProvider>
        <KPICard {...defaultProps} />
      </TooltipProvider>
    );
    const titleDiv = screen.getByText("Events Created").closest("div");
    const svgs = titleDiv?.querySelectorAll("svg") ?? [];
    expect(svgs.length).toBe(0);
  });
});
