import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTrpc } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: {
      organizations: {
        listCurrent: { useQuery: vi.fn() },
      },
      aiVoiceAgent: {
        listCalls: { useQuery: vi.fn() },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/insights/call-history",
}));
vi.mock("@calcom/trpc/react", () => ({
  trpc: mockTrpc,
}));
vi.mock("~/data-table/DataTableProvider", () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => ({ limit: 25, offset: 0, searchTerm: "" }),
}));
vi.mock("~/data-table/hooks/useSegments", () => ({
  useSegments: vi.fn(),
}));
vi.mock("~/data-table/components", () => ({
  DataTableWrapper: ({
    children,
    isPending,
    testId,
  }: {
    children: React.ReactNode;
    isPending: boolean;
    testId: string;
  }) => (
    <div data-testid={testId} data-pending={isPending}>
      {children}
    </div>
  ),
  DataTableToolbar: {
    SearchBar: () => null,
  },
  DataTableFilters: {
    ColumnVisibilityButton: () => null,
    FilterBar: () => null,
    ClearFiltersButton: () => null,
  },
}));
vi.mock("@calcom/features/ee/organizations/context/provider", () => ({
  useOrgBranding: () => null,
}));
vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: { MULTI_SELECT: "ms" },
  convertFacetedValuesToMap: vi.fn(() => new Map()),
}));
vi.mock("@calcom/web/modules/ee/workflows/components/CallDetailsSheet", () => ({
  CallDetailsSheet: () => null,
}));

import InsightsCallHistoryPage from "./insights-call-history-view";

describe("InsightsCallHistoryPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render the call history table", () => {
    mockTrpc.viewer.organizations.listCurrent.useQuery.mockReturnValue({
      data: undefined,
    });
    mockTrpc.viewer.aiVoiceAgent.listCalls.useQuery.mockReturnValue({
      data: { calls: [], totalCount: 0 },
      isPending: false,
      error: null,
    });
    render(<InsightsCallHistoryPage />);
    expect(screen.getByTestId("call-history-data-table")).toBeInTheDocument();
  });

  it("should show pending state when loading", () => {
    mockTrpc.viewer.organizations.listCurrent.useQuery.mockReturnValue({
      data: undefined,
    });
    mockTrpc.viewer.aiVoiceAgent.listCalls.useQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      error: null,
    });
    render(<InsightsCallHistoryPage />);
    expect(screen.getByTestId("call-history-data-table")).toHaveAttribute("data-pending", "true");
  });
});
