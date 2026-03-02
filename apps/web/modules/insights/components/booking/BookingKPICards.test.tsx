import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => {
  return {
    mockTrpc: {
      viewer: {
        insights: {
          bookingKPIStats: {
            useQuery: vi.fn(),
          },
        },
      },
    },
    mockParams: {},
  };
});

vi.mock("@calcom/trpc/react", () => ({
  trpc: mockTrpc,
}));

vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { BookingKPICards } from "./BookingKPICards";

describe("BookingKPICards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.bookingKPIStats.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });

    render(<BookingKPICards />);
    expect(screen.getByText("events")).toBeInTheDocument();
    expect(screen.getByText("performance")).toBeInTheDocument();
  });

  it("should return null when not success and not pending", () => {
    mockTrpc.viewer.insights.bookingKPIStats.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isError: false,
    });

    const { container } = render(<BookingKPICards />);
    expect(container.innerHTML).toBe("");
  });

  it("should render event and performance KPI cards on success", () => {
    const mockData = {
      created: { count: 100, deltaPrevious: 10 },
      completed: { count: 80, deltaPrevious: 5 },
      rescheduled: { count: 10, deltaPrevious: -2 },
      cancelled: { count: 5, deltaPrevious: 0 },
      rating: { count: 4.5, deltaPrevious: 0.2 },
      no_show: { count: 3, deltaPrevious: 1 },
      no_show_guest: { count: 2, deltaPrevious: -1 },
      csat: { count: 85, deltaPrevious: 3 },
      previousRange: { startDate: "2025-01-01", endDate: "2025-01-31" },
    };

    mockTrpc.viewer.insights.bookingKPIStats.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });

    render(<BookingKPICards />);
    expect(screen.getByText("events")).toBeInTheDocument();
    expect(screen.getByText("performance")).toBeInTheDocument();
    expect(screen.getByText("events_created")).toBeInTheDocument();
    expect(screen.getByText("events_completed")).toBeInTheDocument();
    expect(screen.getByText("events_rescheduled")).toBeInTheDocument();
    expect(screen.getByText("events_cancelled")).toBeInTheDocument();
  });
});
