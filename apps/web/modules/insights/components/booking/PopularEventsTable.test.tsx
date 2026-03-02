import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { popularEvents: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { PopularEventsTable } from "./PopularEventsTable";

describe("PopularEventsTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.popularEvents.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<PopularEventsTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render event names and counts when data is available", () => {
    const mockData = [
      { eventTypeId: 1, eventTypeName: "30 Min Meeting", count: 42 },
      { eventTypeId: 2, eventTypeName: "Quick Chat", count: 18 },
    ];
    mockTrpc.viewer.insights.popularEvents.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<PopularEventsTable />);
    expect(screen.getByText("30 Min Meeting")).toBeInTheDocument();
    expect(screen.getByText("Quick Chat")).toBeInTheDocument();
  });

  it("should show empty state when data array is empty", () => {
    mockTrpc.viewer.insights.popularEvents.useQuery.mockReturnValue({
      data: [],
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<PopularEventsTable />);
    expect(screen.getByText("insights_no_data_found_for_filter")).toBeInTheDocument();
  });

  it("should filter out items without eventTypeId", () => {
    const mockData = [
      { eventTypeId: 1, eventTypeName: "Valid Event", count: 10 },
      { eventTypeId: null, eventTypeName: "No ID", count: 5 },
    ];
    mockTrpc.viewer.insights.popularEvents.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<PopularEventsTable />);
    expect(screen.getByText("Valid Event")).toBeInTheDocument();
    expect(screen.queryByText("No ID")).not.toBeInTheDocument();
  });
});
