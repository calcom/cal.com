import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithMostCompletedBookings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { MostCompletedTeamMembersTable } from "./MostCompletedBookings";

describe("MostCompletedTeamMembersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithMostCompletedBookings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<MostCompletedTeamMembersTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "alice", name: "Alice", email: "a@t.com", avatarUrl: "" },
        emailMd5: "abc",
        count: 50,
      },
    ];
    mockTrpc.viewer.insights.membersWithMostCompletedBookings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<MostCompletedTeamMembersTable />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
