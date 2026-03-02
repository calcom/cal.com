import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { routingFormsByStatus: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
}));
vi.mock("@calcom/features/insights/lib", () => ({
  valueFormatter: vi.fn((v: number) => String(v)),
}));

import { RoutingKPICards } from "./RoutingKPICards";

describe("RoutingKPICards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.routingFormsByStatus.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<RoutingKPICards />);
    expect(screen.getByText("stats")).toBeInTheDocument();
  });

  it("should render KPI values on success", () => {
    const mockData = {
      total: 150,
      totalWithoutBooking: 30,
      totalWithBooking: 120,
    };
    mockTrpc.viewer.insights.routingFormsByStatus.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<RoutingKPICards />);
    expect(screen.getByText("routing_forms_total_responses")).toBeInTheDocument();
    expect(screen.getByText("routing_forms_total_responses_without_booking")).toBeInTheDocument();
    expect(screen.getByText("routing_forms_total_responses_with_booking")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });
});
