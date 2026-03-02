import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => {
  return {
    mockTrpc: {
      viewer: {
        insights: {
          bookingsByHourStats: {
            useQuery: vi.fn(),
          },
        },
      },
    },
    mockParams: {},
  };
});

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Rectangle: () => null,
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: mockTrpc,
}));

vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { BookingsByHourChart } from "./BookingsByHourChart";

describe("BookingsByHourChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.bookingsByHourStats.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });

    render(<BookingsByHourChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render chart when data is available", () => {
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 10),
    }));
    mockTrpc.viewer.insights.bookingsByHourStats.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<BookingsByHourChart />);
    expect(screen.getByText("bookings_by_hour")).toBeInTheDocument();
  });

  it("should show empty state when all counts are zero", () => {
    const mockData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    mockTrpc.viewer.insights.bookingsByHourStats.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<BookingsByHourChart />);
    expect(screen.getByText("insights_no_data_found_for_filter")).toBeInTheDocument();
  });
});
