import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithMostBookings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { MostBookedTeamMembersTable } from "./MostBookedTeamMembersTable";

describe("MostBookedTeamMembersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithMostBookings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<MostBookedTeamMembersTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "alice", name: "Alice", email: "a@t.com", avatarUrl: "" },
        emailMd5: "abc",
        count: 42,
      },
    ];
    mockTrpc.viewer.insights.membersWithMostBookings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<MostBookedTeamMembersTable />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should not render content when not success", () => {
    mockTrpc.viewer.insights.membersWithMostBookings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isError: true,
    });
    render(<MostBookedTeamMembersTable />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});
