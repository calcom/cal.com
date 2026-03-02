import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { membersWithMostNoShow: { useQuery: vi.fn() } } },
  },
  mockParams: {},
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));

import { HighestNoShowHostTable } from "./HighestNoShowHostTable";

describe("HighestNoShowHostTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.membersWithMostNoShow.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isError: false,
    });
    render(<HighestNoShowHostTable />);
    expect(screen.getByTestId("chart-card")).toHaveAttribute("data-loading-state", "loading");
  });

  it("should render user stats when data is available", () => {
    const mockData = [
      {
        userId: 1,
        user: { id: 1, username: "eve", name: "Eve", email: "e@t.com", avatarUrl: "" },
        emailMd5: "mno",
        count: 8,
      },
    ];
    mockTrpc.viewer.insights.membersWithMostNoShow.useQuery.mockReturnValue({
      data: mockData,
      isSuccess: true,
      isPending: false,
      isError: false,
    });
    render(<HighestNoShowHostTable />);
    expect(screen.getByText("Eve")).toBeInTheDocument();
  });
});
