import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => {
  return {
    mockTrpc: {
      viewer: {
        insights: {
          averageEventDuration: {
            useQuery: vi.fn(),
          },
        },
      },
    },
    mockParams: {},
  };
});

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: mockTrpc,
}));

vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { AverageEventDurationChart } from "./AverageEventDurationChart";

describe("AverageEventDurationChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.averageEventDuration.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });

    render(<AverageEventDurationChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render chart when data has nonzero values", () => {
    const mockData = [
      { Date: "Jan", Average: 30, formattedDateFull: "January 2025" },
      { Date: "Feb", Average: 45, formattedDateFull: "February 2025" },
    ];
    mockTrpc.viewer.insights.averageEventDuration.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<AverageEventDurationChart />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should show empty state when all durations are zero", () => {
    const mockData = [
      { Date: "Jan", Average: 0, formattedDateFull: "January 2025" },
      { Date: "Feb", Average: 0, formattedDateFull: "February 2025" },
    ];
    mockTrpc.viewer.insights.averageEventDuration.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<AverageEventDurationChart />);
    expect(screen.getByText("insights_no_data_found_for_filter")).toBeInTheDocument();
  });
});
