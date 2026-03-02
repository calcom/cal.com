import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/insights/routing",
}));
vi.mock("~/data-table/DataTableProvider", () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/data-table/hooks/useSegments", () => ({
  useSegments: vi.fn(),
}));
vi.mock("@calcom/web/modules/insights/components/routing", () => ({
  RoutingFormResponsesTable: () => <div data-testid="routing-form-responses" />,
  FailedBookingsByField: () => <div data-testid="failed-bookings-by-field" />,
  RoutedToPerPeriod: () => <div data-testid="routed-to-per-period" />,
  RoutingFunnel: () => <div data-testid="routing-funnel" />,
}));
vi.mock("../components/context/InsightsOrgTeamsProvider", () => ({
  InsightsOrgTeamsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import InsightsRoutingFormResponsesPage from "./insights-routing-view";

describe("InsightsRoutingFormResponsesPage", () => {
  beforeEach(() => vi.clearAllMocks());

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
});
