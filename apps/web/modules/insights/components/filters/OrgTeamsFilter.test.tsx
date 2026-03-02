import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockOrgTeams, mockSession } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: { insights: { teamListForUser: { useQuery: vi.fn() } } },
  },
  mockOrgTeams: {
    orgTeamsType: "yours" as "org" | "team" | "yours",
    selectedTeamId: undefined as number | undefined,
    setOrgTeamsType: vi.fn(),
    setSelectedTeamId: vi.fn(),
  },
  mockSession: {
    data: {
      user: {
        id: 1,
        name: "Test User",
        org: { id: 100 },
        avatarUrl: "https://example.com/avatar.png",
      },
    },
    status: "authenticated" as const,
  },
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("../../hooks/useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => mockOrgTeams,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));
vi.mock("~/filters/components/TeamsFilter", () => ({
  FilterCheckboxField: ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (e: { target: { checked: boolean } }) => void;
  }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  ),
  FilterCheckboxFieldsContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@calcom/ui/components/popover", () => ({
  AnimatedPopover: ({
    text,
    children,
  }: {
    text: string;
    children: React.ReactNode;
    PrefixComponent: React.ReactNode;
  }) => (
    <div>
      <span>{text}</span>
      {children}
    </div>
  ),
}));
vi.mock("@calcom/lib/defaultAvatarImage", () => ({
  getPlaceholderAvatar: vi.fn(() => "placeholder.png"),
}));
vi.mock("@coss/ui/icons", () => ({
  LayersIcon: () => <span>layers</span>,
  SearchIcon: () => <span>search</span>,
}));

import { OrgTeamsFilter } from "./OrgTeamsFilter";

describe("OrgTeamsFilter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render yours option", () => {
    mockTrpc.viewer.insights.teamListForUser.useQuery.mockReturnValue({
      data: [],
    });
    render(<OrgTeamsFilter />);
    expect(screen.getAllByText("yours").length).toBeGreaterThan(0);
  });

  it("should render team list when teams are available", () => {
    mockTrpc.viewer.insights.teamListForUser.useQuery.mockReturnValue({
      data: [
        { id: 100, name: "Org", isOrg: true, logoUrl: "" },
        { id: 1, name: "Team Alpha", isOrg: false, logoUrl: "" },
        { id: 2, name: "Team Beta", isOrg: false, logoUrl: "" },
      ],
    });
    render(<OrgTeamsFilter />);
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
  });

  it("should show all option when org data is available", () => {
    mockTrpc.viewer.insights.teamListForUser.useQuery.mockReturnValue({
      data: [{ id: 100, name: "Org", isOrg: true, logoUrl: "" }],
    });
    render(<OrgTeamsFilter />);
    expect(screen.getByText("all")).toBeInTheDocument();
  });
});
