import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    data: {
      user: {
        id: 1,
        name: "Test User",
        org: { id: 100, role: "ADMIN" },
        avatarUrl: "",
      },
    },
    status: "authenticated" as const,
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));
vi.mock("@calcom/features/auth/lib/checkAdminOrOwner", () => ({
  checkAdminOrOwner: (role: string | undefined) => role === "ADMIN" || role === "OWNER",
}));

import { InsightsOrgTeamsProvider, InsightsOrgTeamsContext } from "./InsightsOrgTeamsProvider";

function TestConsumer() {
  const context = useContext(InsightsOrgTeamsContext);
  if (!context) return <div>no context</div>;
  return (
    <div>
      <span data-testid="org-teams-type">{context.orgTeamsType}</span>
      <span data-testid="selected-team-id">{context.selectedTeamId ?? "none"}</span>
    </div>
  );
}

describe("InsightsOrgTeamsProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should default to org type for admin users with org", () => {
    mockSession.data.user.org = { id: 100, role: "ADMIN" };
    render(
      <InsightsOrgTeamsProvider>
        <TestConsumer />
      </InsightsOrgTeamsProvider>
    );
    expect(screen.getByTestId("org-teams-type").textContent).toBe("org");
  });

  it("should default to yours type for non-admin users", () => {
    mockSession.data.user.org = { id: 100, role: "MEMBER" };
    render(
      <InsightsOrgTeamsProvider>
        <TestConsumer />
      </InsightsOrgTeamsProvider>
    );
    expect(screen.getByTestId("org-teams-type").textContent).toBe("yours");
  });

  it("should provide selectedTeamId as undefined initially", () => {
    render(
      <InsightsOrgTeamsProvider>
        <TestConsumer />
      </InsightsOrgTeamsProvider>
    );
    expect(screen.getByTestId("selected-team-id").textContent).toBe("none");
  });

  it("should render children", () => {
    render(
      <InsightsOrgTeamsProvider>
        <div data-testid="child">Hello</div>
      </InsightsOrgTeamsProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
