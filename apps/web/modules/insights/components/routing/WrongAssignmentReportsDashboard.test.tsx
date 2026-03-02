import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockOrgTeams, mockColumns, mockFaceted, mockDataTable, mockFilterValue } = vi.hoisted(
  () => ({
    mockTrpc: {
      viewer: {
        bookings: {
          getWrongAssignmentReports: { useQuery: vi.fn() },
          updateWrongAssignmentReportStatus: { useMutation: vi.fn() },
        },
      },
      useUtils: vi.fn(() => ({
        viewer: {
          bookings: {
            getWrongAssignmentReports: { invalidate: vi.fn() },
          },
        },
      })),
    },
    mockOrgTeams: { isAll: false, teamId: 1 as number | undefined, userId: undefined as number | undefined },
    mockColumns: [
      { id: "routingFormId", accessorKey: "routingFormId", header: "Form" },
      { id: "status", accessorKey: "status", header: "Status" },
    ],
    mockFaceted: vi.fn(() => vi.fn(() => new Map())),
    mockDataTable: { sorting: [], limit: 10, offset: 0 },
    mockFilterValue: null,
  })
);

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => mockOrgTeams,
}));
vi.mock("@calcom/web/modules/insights/hooks/useWrongAssignmentColumns", () => ({
  useWrongAssignmentColumns: () => mockColumns,
}));
vi.mock("@calcom/web/modules/insights/hooks/useWrongAssignmentFacetedUniqueValues", () => ({
  useWrongAssignmentFacetedUniqueValues: () => mockFaceted,
}));
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => mockDataTable,
}));
vi.mock("~/data-table/hooks/useFilterValue", () => ({
  useFilterValue: () => mockFilterValue,
}));
vi.mock("@calcom/web/modules/data-table/components", () => ({
  DataTableWrapper: ({
    children,
    isPending,
    ToolbarLeft,
  }: {
    children: React.ReactNode;
    isPending: boolean;
    ToolbarLeft?: React.ReactNode;
  }) => (
    <div data-testid="data-table-wrapper" data-pending={isPending}>
      {ToolbarLeft}
      {children}
    </div>
  ),
  DataTableFilters: {
    FilterBar: () => null,
    ClearFiltersButton: () => null,
  },
  DataTableSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock("../filters/OrgTeamsFilter", () => ({
  OrgTeamsFilter: () => null,
}));
vi.mock("@calcom/web/components/booking/RoutingFormResponseSheet", () => ({
  RoutingFormResponseSheet: () => null,
}));
vi.mock("@calcom/web/components/booking/RoutingTraceSheet", () => ({
  RoutingTraceSheet: () => null,
}));
vi.mock("@calcom/features/data-table", () => ({
  ZSingleSelectFilterValue: {},
}));
vi.mock("@calcom/prisma/enums", () => ({
  WrongAssignmentReportStatus: {
    PENDING: "PENDING",
    REVIEWED: "REVIEWED",
    RESOLVED: "RESOLVED",
    DISMISSED: "DISMISSED",
  },
}));

import { WrongAssignmentReportsDashboard } from "./WrongAssignmentReportsDashboard";

describe("WrongAssignmentReportsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrpc.viewer.bookings.updateWrongAssignmentReportStatus.useMutation.mockReturnValue({
      mutate: vi.fn(),
    });
  });

  it("should render data table wrapper when teamId exists", () => {
    mockTrpc.viewer.bookings.getWrongAssignmentReports.useQuery.mockReturnValue({
      data: { reports: [], totalCount: 0 },
      isPending: false,
    });
    render(<WrongAssignmentReportsDashboard />);
    expect(screen.getByTestId("data-table-wrapper")).toBeInTheDocument();
  });

  it("should show pending and handled tab buttons", () => {
    mockTrpc.viewer.bookings.getWrongAssignmentReports.useQuery.mockReturnValue({
      data: { reports: [], totalCount: 0 },
      isPending: false,
    });
    render(<WrongAssignmentReportsDashboard />);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("handled")).toBeInTheDocument();
  });

  it("should show empty screen when no teamId", () => {
    mockOrgTeams.teamId = undefined;
    mockTrpc.viewer.bookings.getWrongAssignmentReports.useQuery.mockReturnValue({
      data: undefined,
      isPending: false,
    });
    render(<WrongAssignmentReportsDashboard />);
    expect(screen.getByText("wrong_assignment_reports")).toBeInTheDocument();
    expect(screen.getByText("select_team_to_view_reports")).toBeInTheDocument();
    mockOrgTeams.teamId = 1; // reset
  });
});
