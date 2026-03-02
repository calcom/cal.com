import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: "/insights",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
vi.mock("~/data-table/DataTableProvider", () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/data-table/hooks/useSegments", () => ({
  useSegments: vi.fn(),
}));
vi.mock("~/data-table/components", () => ({
  DataTableFilters: {
    FilterBar: () => null,
    ClearFiltersButton: () => null,
  },
  DateRangeFilter: () => null,
}));
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => ({ removeFilter: vi.fn() }),
}));
vi.mock("@calcom/web/modules/insights/components/booking", () => ({
  BookingKPICards: () => <div data-testid="booking-kpi-cards" />,
  EventTrendsChart: () => <div data-testid="event-trends-chart" />,
  BookingsByHourChart: () => <div data-testid="bookings-by-hour" />,
  AverageEventDurationChart: () => <div data-testid="avg-event-duration" />,
  MostBookedTeamMembersTable: () => <div data-testid="most-booked" />,
  LeastBookedTeamMembersTable: () => <div data-testid="least-booked" />,
  MostCompletedTeamMembersTable: () => <div data-testid="most-completed" />,
  LeastCompletedTeamMembersTable: () => <div data-testid="least-completed" />,
  MostCancelledBookingsTables: () => <div data-testid="most-cancelled" />,
  HighestNoShowHostTable: () => <div data-testid="highest-no-show" />,
  NoShowHostsOverTimeChart: () => <div data-testid="no-show-over-time" />,
  CSATOverTimeChart: () => <div data-testid="csat-over-time" />,
  HighestRatedMembersTable: () => <div data-testid="highest-rated" />,
  LowestRatedMembersTable: () => <div data-testid="lowest-rated" />,
  RecentNoShowGuestsChart: () => <div data-testid="recent-no-show" />,
  RecentFeedbackTable: () => <div data-testid="recent-feedback" />,
  PopularEventsTable: () => <div data-testid="popular-events" />,
  TimezoneBadge: () => null,
}));
vi.mock("../components/context/InsightsOrgTeamsProvider", () => ({
  InsightsOrgTeamsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../components/filters/DateTargetSelector", () => ({
  DateTargetSelector: () => null,
}));
vi.mock("../components/filters/Download/Download", () => ({
  Download: () => null,
}));
vi.mock("../components/filters/OrgTeamsFilter", () => ({
  OrgTeamsFilter: () => null,
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsBookings", () => ({
  useInsightsBookings: () => ({ table: {} }),
}));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => ({ isAll: false, teamId: 1, userId: null }),
}));
vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: { DATE_RANGE: "dr" },
}));

import InsightsPage from "./insights-view";

describe("InsightsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render all booking chart components", () => {
    render(<InsightsPage timeZone="UTC" />);
    expect(screen.getByTestId("booking-kpi-cards")).toBeInTheDocument();
    expect(screen.getByTestId("event-trends-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bookings-by-hour")).toBeInTheDocument();
    expect(screen.getByTestId("avg-event-duration")).toBeInTheDocument();
  });

  it("should render member ranking tables", () => {
    render(<InsightsPage timeZone="UTC" />);
    expect(screen.getByTestId("most-booked")).toBeInTheDocument();
    expect(screen.getByTestId("least-booked")).toBeInTheDocument();
    expect(screen.getByTestId("most-completed")).toBeInTheDocument();
    expect(screen.getByTestId("least-completed")).toBeInTheDocument();
  });

  it("should render feedback and no-show sections", () => {
    render(<InsightsPage timeZone="UTC" />);
    expect(screen.getByTestId("highest-rated")).toBeInTheDocument();
    expect(screen.getByTestId("lowest-rated")).toBeInTheDocument();
    expect(screen.getByTestId("recent-feedback")).toBeInTheDocument();
    expect(screen.getByTestId("popular-events")).toBeInTheDocument();
  });

  it("should render contact support link", () => {
    render(<InsightsPage timeZone="UTC" />);
    expect(screen.getByText("looking_for_more_insights")).toBeInTheDocument();
    expect(screen.getByText("contact_support")).toBeInTheDocument();
  });
});
