import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { recentRatings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));
vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { RecentFeedbackTable } from "./RecentFeedbackTable";

describe("RecentFeedbackTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.recentRatings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<RecentFeedbackTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render feedback content when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { name: "Alice", avatarUrl: "" },
        rating: 5,
        feedback: "Great session!",
      },
    ];
    mockTrpc.viewer.insights.recentRatings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<RecentFeedbackTable />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should not render content when not success", () => {
    mockTrpc.viewer.insights.recentRatings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isError: true,
    });
    render(<RecentFeedbackTable />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});
