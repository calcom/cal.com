import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithLeastCompletedBookings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { LeastCompletedTeamMembersTable } from "./LeastCompletedBookings";

describe("LeastCompletedTeamMembersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithLeastCompletedBookings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<LeastCompletedTeamMembersTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "charlie", name: "Charlie", email: "c@t.com", avatarUrl: "" },
        emailMd5: "ghi",
        count: 2,
      },
    ];
    mockTrpc.viewer.insights.membersWithLeastCompletedBookings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<LeastCompletedTeamMembersTable />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });
});
