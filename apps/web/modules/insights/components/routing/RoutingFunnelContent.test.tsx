import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { RoutingFunnelContent, legend } from "./RoutingFunnelContent";

describe("RoutingFunnelContent", () => {
  const mockData = [
    {
      name: "Jan",
      formattedDateFull: "January 2025",
      totalSubmissions: 100,
      successfulRoutings: 80,
      acceptedBookings: 60,
    },
    {
      name: "Feb",
      formattedDateFull: "February 2025",
      totalSubmissions: 120,
      successfulRoutings: 90,
      acceptedBookings: 70,
    },
  ];

  it("should render area chart with data", () => {
    render(<RoutingFunnelContent data={mockData} />);
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("should render all three areas when all legend items are enabled", () => {
    render(<RoutingFunnelContent data={mockData} enabledLegend={legend} />);
    expect(screen.getByTestId("area-totalSubmissions")).toBeInTheDocument();
    expect(screen.getByTestId("area-successfulRoutings")).toBeInTheDocument();
    expect(screen.getByTestId("area-acceptedBookings")).toBeInTheDocument();
  });

  it("should only render enabled legend areas", () => {
    const partialLegend = [{ label: "Total Submissions", color: "#9AA2F7" }];
    render(<RoutingFunnelContent data={mockData} enabledLegend={partialLegend} />);
    expect(screen.getByTestId("area-totalSubmissions")).toBeInTheDocument();
    expect(screen.queryByTestId("area-successfulRoutings")).not.toBeInTheDocument();
    expect(screen.queryByTestId("area-acceptedBookings")).not.toBeInTheDocument();
  });

  it("should export legend with three items", () => {
    expect(legend).toHaveLength(3);
    expect(legend[0].label).toBe("Total Submissions");
    expect(legend[1].label).toBe("Successful Routings");
    expect(legend[2].label).toBe("Accepted Bookings");
  });
});
