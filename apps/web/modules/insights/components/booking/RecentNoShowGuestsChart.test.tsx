import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { recentNoShowGuests: { useQuery: vi.fn() } } },
  },
  mockParams: { timeZone: "UTC" },
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));
vi.mock("@calcom/lib/hooks/useCopy", () => ({
  useCopy: () => ({ copyToClipboard: vi.fn(), isCopied: false }),
}));
vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@calcom/ui/components/badge", () => ({
  InfoBadge: () => null,
}));

import { RecentNoShowGuestsChart } from "./RecentNoShowGuestsChart";

describe("RecentNoShowGuestsChart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.recentNoShowGuests.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<RecentNoShowGuestsChart />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render guest data when available", () => {
    const mockData = [
      {
        bookingId: 1,
        guestName: "John Guest",
        guestEmail: "john@guest.com",
        eventTypeName: "30min Meeting",
        startTime: "2025-01-15T10:00:00Z",
      },
    ];
    mockTrpc.viewer.insights.recentNoShowGuests.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<RecentNoShowGuestsChart />);
    expect(screen.getByText("John Guest")).toBeInTheDocument();
    expect(screen.getByText("30min Meeting")).toBeInTheDocument();
  });

  it("should show empty state when data array is empty", () => {
    mockTrpc.viewer.insights.recentNoShowGuests.useQuery.mockReturnValue({
      data: [],
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<RecentNoShowGuestsChart />);
    expect(screen.getByText("insights_no_data_found_for_filter")).toBeInTheDocument();
  });
});
