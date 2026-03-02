import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams, mockOrgTeams, mockColumns, mockFaceted, mockDataTable, mockFilterValue } =
  vi.hoisted(() => ({
    mockTrpc: {
      viewer: {
        insights: {
          routingFormResponsesHeaders: { useQuery: vi.fn() },
          routingFormResponses: { useQuery: vi.fn() },
        },
      },
    },
    mockParams: {},
    mockOrgTeams: { isAll: false, teamId: 1, userId: null },
    mockColumns: [
      { id: "formId", accessorKey: "formId", header: "Form" },
      { id: "createdAt", accessorKey: "createdAt", header: "Created At" },
    ],
    mockFaceted: vi.fn(() => vi.fn(() => new Map())),
    mockDataTable: {
      sorting: [],
      limit: 10,
      offset: 0,
      ctaContainerRef: { current: null },
      updateFilter: vi.fn(),
    },
    mockFilterValue: null,
  }));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => mockOrgTeams,
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsColumns", () => ({
  useInsightsColumns: () => mockColumns,
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingFacetedUniqueValues", () => ({
  useInsightsRoutingFacetedUniqueValues: () => mockFaceted,
}));
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => mockDataTable,
}));
vi.mock("~/data-table/hooks/useFilterValue", () => ({
  useFilterValue: () => mockFilterValue,
}));
vi.mock("@calcom/web/modules/data-table/components", () => ({
  DataTableWrapper: ({ children, isPending }: { children: React.ReactNode; isPending: boolean }) => (
    <div data-testid="data-table-wrapper" data-pending={isPending}>
      {children}
    </div>
  ),
  DataTableFilters: {
    ColumnVisibilityButton: () => null,
    FilterBar: () => null,
    ClearFiltersButton: () => null,
  },
  DataTableSegment: {
    SaveButton: () => null,
    Select: () => null,
  },
  DataTableSkeleton: () => <div data-testid="skeleton" />,
  DateRangeFilter: () => null,
}));
vi.mock("../filters/Download/RoutingFormResponsesDownload", () => ({
  RoutingFormResponsesDownload: () => null,
}));
vi.mock("../filters/OrgTeamsFilter", () => ({
  OrgTeamsFilter: () => null,
}));
vi.mock("@calcom/web/modules/insights/components/booking", () => ({
  TimezoneBadge: () => null,
}));
vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: { DATE_RANGE: "dr", SINGLE_SELECT: "ss" },
  convertMapToFacetedValues: vi.fn(() => []),
  ZSingleSelectFilterValue: {},
}));

vi.mock("./RoutingKPICards", () => ({
  RoutingKPICards: () => null,
}));

import { RoutingFormResponsesTable } from "./RoutingFormResponsesTable";

describe("RoutingFormResponsesTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render data table wrapper", () => {
    mockTrpc.viewer.insights.routingFormResponsesHeaders.useQuery.mockReturnValue({
      data: [],
      isSuccess: true,
    });
    mockTrpc.viewer.insights.routingFormResponses.useQuery.mockReturnValue({
      data: { data: [], total: 0 },
      isPending: false,
    });
    render(<RoutingFormResponsesTable />);
    expect(screen.getByTestId("data-table-wrapper")).toBeInTheDocument();
  });

  it("should show pending state when data is loading", () => {
    mockTrpc.viewer.insights.routingFormResponsesHeaders.useQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
    });
    mockTrpc.viewer.insights.routingFormResponses.useQuery.mockReturnValue({
      data: undefined,
      isPending: true,
    });
    render(<RoutingFormResponsesTable />);
    expect(screen.getByTestId("data-table-wrapper")).toHaveAttribute("data-pending", "true");
  });
});
