import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithHighestRatings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { HighestRatedMembersTable } from "./HighestRatedMembersTable";

describe("HighestRatedMembersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithHighestRatings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<HighestRatedMembersTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "alice", name: "Alice", email: "a@t.com", avatarUrl: "" },
        emailMd5: "abc",
        count: 4.8,
      },
    ];
    mockTrpc.viewer.insights.membersWithHighestRatings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<HighestRatedMembersTable />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
