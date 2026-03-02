import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams, mockLegend } = vi.hoisted(() => {
  return {
    mockTrpc: {
      viewer: {
        insights: {
          eventTrends: {
            useQuery: vi.fn(),
          },
        },
      },
    },
    mockParams: {},
    mockLegend: {
      enabledLegend: [
        { label: "Created", color: "#a855f7" },
        { label: "Completed", color: "#22c55e" },
      ],
      toggleSeries: vi.fn(),
    },
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

vi.mock("@calcom/web/modules/insights/hooks/useToggleableLegend", () => ({
  useToggleableLegend: () => mockLegend,
}));

vi.mock("@calcom/features/insights/lib/valueFormatter", () => ({
  valueFormatter: vi.fn((v: number) => String(v)),
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { EventTrendsChart } from "./EventTrendsChart";

describe("EventTrendsChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.eventTrends.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });

    render(<EventTrendsChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render chart when data is available", () => {
    const mockData = [
      {
        Month: "Jan",
        Created: 10,
        Completed: 8,
        Rescheduled: 1,
        Cancelled: 1,
        formattedDateFull: "January 2025",
      },
    ];
    mockTrpc.viewer.insights.eventTrends.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<EventTrendsChart />);
    expect(screen.getByText("event_trends")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should not render chart content when not success", () => {
    mockTrpc.viewer.insights.eventTrends.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isError: true,
    });

    render(<EventTrendsChart />);
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
