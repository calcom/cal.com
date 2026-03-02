import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { noShowHostsOverTime: { useQuery: vi.fn() } } },
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
vi.mock("@calcom/features/insights/lib/valueFormatter", () => ({
  valueFormatter: vi.fn((v: number) => String(v)),
}));

import { NoShowHostsOverTimeChart } from "./NoShowHostsOverTimeChart";

describe("NoShowHostsOverTimeChart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.noShowHostsOverTime.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<NoShowHostsOverTimeChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render chart when data is available", () => {
    const mockData = [{ Month: "Jan", Count: 5, formattedDateFull: "January 2025" }];
    mockTrpc.viewer.insights.noShowHostsOverTime.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<NoShowHostsOverTimeChart />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
