import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithLowestRatings: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { LowestRatedMembersTable } from "./LowestRatedMembersTable";

describe("LowestRatedMembersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithLowestRatings.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<LowestRatedMembersTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "bob", name: "Bob", email: "b@t.com", avatarUrl: "" },
        emailMd5: "def",
        count: 2.1,
      },
    ];
    mockTrpc.viewer.insights.membersWithLowestRatings.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<LowestRatedMembersTable />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
