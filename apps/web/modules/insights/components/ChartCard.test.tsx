import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ChartCard, ChartCardItem } from "./ChartCard";

describe("ChartCard", () => {
  it("should render title", () => {
    render(<ChartCard title="Test Chart">Content</ChartCard>);
    expect(screen.getByText("Test Chart")).toBeInTheDocument();
  });

  it("should show loading spinner when isPending and no children", () => {
    render(<ChartCard title="Test" isPending={true} />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should show error state when isError", () => {
    render(
      <ChartCard title="Test" isError={true}>
        Content
      </ChartCard>
    );
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "error");
  });

  it("should show loaded state when neither pending nor error", () => {
    render(<ChartCard title="Test">Content</ChartCard>);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loaded");
  });

  it("should render legend items when provided", () => {
    const legend = [
      { label: "Series A", color: "#ff0000" },
      { label: "Series B", color: "#00ff00" },
    ];
    render(
      <TooltipProvider>
        <ChartCard title="Test" legend={legend}>
          Content
        </ChartCard>
      </TooltipProvider>
    );
    expect(screen.getByText("Series A")).toBeInTheDocument();
    expect(screen.getByText("Series B")).toBeInTheDocument();
  });

  it("should call onSeriesToggle when legend item is clicked", () => {
    const onToggle = vi.fn();
    const legend = [{ label: "Series A", color: "#ff0000" }];
    render(
      <TooltipProvider>
        <ChartCard title="Test" legend={legend} enabledLegend={legend} onSeriesToggle={onToggle}>
          Content
        </ChartCard>
      </TooltipProvider>
    );
    fireEvent.click(screen.getByLabelText("Toggle Series A"));
    expect(onToggle).toHaveBeenCalledWith("Series A");
  });

  it("should set data-chart-id from title", () => {
    render(<ChartCard title="Event Trends">Content</ChartCard>);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-chart-id", "event-trends");
  });
});

describe("ChartCardItem", () => {
  it("should render children and count", () => {
    render(<ChartCardItem count={42}>Item Name</ChartCardItem>);
    expect(screen.getByText("Item Name")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should not render count when undefined", () => {
    render(<ChartCardItem>Item Only</ChartCardItem>);
    expect(screen.getByText("Item Only")).toBeInTheDocument();
  });
});
