import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { csatOverTime: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { CSATOverTimeChart } from "./CSATOverTimeChart";

describe("CSATOverTimeChart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.csatOverTime.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<CSATOverTimeChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render chart when data is available", () => {
    const mockData = [
      { Month: "Jan", CSAT: 85.5, formattedDateFull: "January 2025" },
      { Month: "Feb", CSAT: 90.2, formattedDateFull: "February 2025" },
    ];
    mockTrpc.viewer.insights.csatOverTime.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<CSATOverTimeChart />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should not render chart when not success", () => {
    mockTrpc.viewer.insights.csatOverTime.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isError: true,
    });
    render(<CSATOverTimeChart />);
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
