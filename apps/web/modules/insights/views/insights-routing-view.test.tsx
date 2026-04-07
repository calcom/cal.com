import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockDataTable, mockFilterValue } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: {
      insights: {
        getRoutingFormsForFilters: { useQuery: vi.fn() },
      },
    },
  },
  mockDataTable: {
    updateFilter: vi.fn(),
  },
  mockFilterValue: { current: undefined as { data: string } | undefined },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/insights/routing",
}));
vi.mock("~/data-table/DataTableProvider", () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/data-table/hooks/useSegments", () => ({
  useSegments: vi.fn(),
}));
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => mockDataTable,
}));
vi.mock("~/data-table/hooks/useFilterValue", () => ({
  useFilterValue: () => mockFilterValue.current,
}));
vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: { SINGLE_SELECT: "ss" },
  ZSingleSelectFilterValue: {},
}));
vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonButton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-button" className={className} />
  ),
}));
vi.mock("@calcom/web/modules/data-table/components", () => ({
  DataTableSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock("@calcom/web/modules/insights/components/routing", () => ({
  RoutingFormResponsesTable: () => <div data-testid="routing-form-responses" />,
  FailedBookingsByField: () => <div data-testid="failed-bookings-by-field" />,
  RoutedToPerPeriod: () => <div data-testid="routed-to-per-period" />,
  RoutingFunnel: () => <div data-testid="routing-funnel" />,
  RoutingKPICardsSkeleton: () => <div data-testid="kpi-skeleton" />,
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => ({ isAll: false, teamId: 1, userId: null }),
}));
vi.mock("../components/context/InsightsOrgTeamsProvider", () => ({
  InsightsOrgTeamsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import InsightsRoutingFormResponsesPage from "./insights-routing-view";

describe("InsightsRoutingFormResponsesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: formId already set (guard passes through)
    mockFilterValue.current = { data: "form-1" } as { data: string };
    mockTrpc.viewer.insights.getRoutingFormsForFilters.useQuery.mockReturnValue({
      data: [{ id: "form-1", name: "Form 1" }],
      isLoading: false,
    });
  });

  it("should render routing form responses table", () => {
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("routing-form-responses")).toBeInTheDocument();
  });

  it("should render routing funnel", () => {
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("routing-funnel")).toBeInTheDocument();
  });

  it("should render routed to per period and failed bookings", () => {
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("routed-to-per-period")).toBeInTheDocument();
    expect(screen.getByTestId("failed-bookings-by-field")).toBeInTheDocument();
  });

  it("should render contact support link", () => {
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByText("looking_for_more_insights")).toBeInTheDocument();
    expect(screen.getByText("contact_support")).toBeInTheDocument();
  });

  it("should show skeleton while forms are loading and no formId is set", () => {
    mockFilterValue.current = undefined;
    mockTrpc.viewer.insights.getRoutingFormsForFilters.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("kpi-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("routing-form-responses")).not.toBeInTheDocument();
  });

  it("should show skeleton while forms loaded but default filter not yet applied", () => {
    mockFilterValue.current = undefined;
    mockTrpc.viewer.insights.getRoutingFormsForFilters.useQuery.mockReturnValue({
      data: [{ id: "form-1", name: "Form 1" }],
      isLoading: false,
    });
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("kpi-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(mockDataTable.updateFilter).toHaveBeenCalledWith("formId", {
      type: "ss",
      data: "form-1",
    });
  });

  it("should render children when no forms exist", () => {
    mockFilterValue.current = undefined;
    mockTrpc.viewer.insights.getRoutingFormsForFilters.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<InsightsRoutingFormResponsesPage timeZone="UTC" />);
    expect(screen.getByTestId("routing-form-responses")).toBeInTheDocument();
  });
});
