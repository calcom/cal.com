import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { failedBookingsByField: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

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

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
}));

import { FailedBookingsByField } from "./FailedBookingsByField";

describe("FailedBookingsByField", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isLoading", () => {
    mockTrpc.viewer.insights.failedBookingsByField.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<FailedBookingsByField />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should return null when data is empty", () => {
    mockTrpc.viewer.insights.failedBookingsByField.useQuery.mockReturnValue({
      data: {},
      isLoading: false,
      isError: false,
    });
    const { container } = render(<FailedBookingsByField />);
    expect(container.innerHTML).toBe("");
  });

  it("should render chart when data has field entries", () => {
    const mockData = {
      "My Form": {
        Location: [
          { optionId: "1", count: 5, optionLabel: "New York" },
          { optionId: "2", count: 3, optionLabel: "London" },
        ],
      },
    };
    mockTrpc.viewer.insights.failedBookingsByField.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    render(<FailedBookingsByField />);
    expect(screen.getByText("failed_bookings_by_field")).toBeInTheDocument();
  });
});
