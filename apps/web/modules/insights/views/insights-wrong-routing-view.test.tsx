import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/data-table/DataTableProvider", () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/data-table/hooks/useSegments", () => ({
  useSegments: vi.fn(),
}));
vi.mock("@calcom/web/modules/insights/components/routing", () => ({
  WrongAssignmentReportsDashboard: () => <div data-testid="wrong-assignment-dashboard" />,
}));
vi.mock("../components/context/InsightsOrgTeamsProvider", () => ({
  InsightsOrgTeamsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import InsightsWrongRoutingPage from "./insights-wrong-routing-view";

describe("InsightsWrongRoutingPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render wrong assignment reports dashboard", () => {
    render(<InsightsWrongRoutingPage timeZone="UTC" />);
    expect(screen.getByTestId("wrong-assignment-dashboard")).toBeInTheDocument();
  });
});
