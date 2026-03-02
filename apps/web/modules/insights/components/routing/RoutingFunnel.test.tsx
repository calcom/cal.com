import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams, mockLegend } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { getRoutingFunnelData: { useQuery: vi.fn() } } },
  },
  mockParams: {},
  mockLegend: {
    enabledLegend: [
      { label: "Total Submissions", color: "#9AA2F7" },
      { label: "Successful Routings", color: "#89CFB5" },
      { label: "Accepted Bookings", color: "#F7A1A1" },
    ],
    toggleSeries: vi.fn(),
  },
}));

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
}));
vi.mock("@calcom/web/modules/insights/hooks/useToggleableLegend", () => ({
  useToggleableLegend: () => mockLegend,
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { RoutingFunnel } from "./RoutingFunnel";

describe("RoutingFunnel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show skeleton when loading", () => {
    mockTrpc.viewer.insights.getRoutingFunnelData.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isLoading: true,
      isError: false,
    });
    render(<RoutingFunnel />);
    expect(screen.getByText("routing_funnel")).toBeInTheDocument();
  });

  it("should render chart content when data is available", () => {
    const mockData = [
      {
        name: "Jan",
        formattedDateFull: "January 2025",
        totalSubmissions: 100,
        successfulRoutings: 80,
        acceptedBookings: 60,
      },
    ];
    mockTrpc.viewer.insights.getRoutingFunnelData.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isLoading: false,
      isError: false,
    });
    render(<RoutingFunnel />);
    expect(screen.getByText("routing_funnel")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });
});
