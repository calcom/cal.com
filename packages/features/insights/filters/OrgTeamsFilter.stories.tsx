import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { InsightsOrgTeamsContext } from "../context/InsightsOrgTeamsProvider";
import type { OrgTeamsType } from "./OrgTeamsFilter";
import { OrgTeamsFilter } from "./OrgTeamsFilter";

// Mock TRPC hook
const mockTRPCHook = (data: any) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: () => Promise.resolve({ data }),
});

// Mock teams data
const mockTeamsData = [
  {
    id: 1,
    name: "Engineering",
    isOrg: false,
    logoUrl: "https://cal.com/api/avatar/team-1.png",
  },
  {
    id: 2,
    name: "Marketing",
    isOrg: false,
    logoUrl: "https://cal.com/api/avatar/team-2.png",
  },
  {
    id: 3,
    name: "Sales",
    isOrg: false,
    logoUrl: "https://cal.com/api/avatar/team-3.png",
  },
  {
    id: 4,
    name: "Design",
    isOrg: false,
    logoUrl: null,
  },
];

const mockOrgData = [
  {
    id: 100,
    name: "Acme Corp",
    isOrg: true,
    logoUrl: "https://cal.com/api/avatar/org.png",
  },
  ...mockTeamsData,
];

// Mock session data
const mockSession = {
  user: {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    avatarUrl: "https://cal.com/api/avatar/user.png",
    org: {
      id: 100,
      name: "Acme Corp",
      role: "OWNER",
    },
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockSessionWithoutOrg = {
  user: {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    avatarUrl: "https://cal.com/api/avatar/user.png",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock TRPC module
jest.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      insights: {
        teamListForUser: {
          useQuery: jest.fn(),
        },
      },
    },
  },
}));

const { trpc } = require("@calcom/trpc/react");

// Wrapper component with context providers
function OrgTeamsFilterWrapper({
  teamsData,
  session,
  initialOrgTeamsType = "org",
  initialSelectedTeamId,
}: {
  teamsData: any[];
  session: any;
  initialOrgTeamsType?: OrgTeamsType;
  initialSelectedTeamId?: number;
}) {
  const [orgTeamsType, setOrgTeamsType] = useState<OrgTeamsType>(initialOrgTeamsType);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(initialSelectedTeamId);

  // Mock TRPC response
  trpc.viewer.insights.teamListForUser.useQuery.mockReturnValue(mockTRPCHook(teamsData));

  return (
    <SessionProvider session={session}>
      <InsightsOrgTeamsContext.Provider
        value={{
          orgTeamsType,
          setOrgTeamsType,
          selectedTeamId,
          setSelectedTeamId,
        }}>
        <OrgTeamsFilter />
      </InsightsOrgTeamsContext.Provider>
    </SessionProvider>
  );
}

const meta = {
  component: OrgTeamsFilter,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrgTeamsFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OrgTeamsFilterWrapper teamsData={mockOrgData} session={mockSession} initialOrgTeamsType="org" />
  ),
};

export const SelectedYours: Story = {
  render: () => (
    <OrgTeamsFilterWrapper
      teamsData={mockOrgData}
      session={mockSession}
      initialOrgTeamsType="yours"
    />
  ),
};

export const SelectedTeam: Story = {
  render: () => (
    <OrgTeamsFilterWrapper
      teamsData={mockOrgData}
      session={mockSession}
      initialOrgTeamsType="team"
      initialSelectedTeamId={1}
    />
  ),
};

export const WithoutOrganization: Story = {
  render: () => (
    <OrgTeamsFilterWrapper
      teamsData={mockTeamsData}
      session={mockSessionWithoutOrg}
      initialOrgTeamsType="yours"
    />
  ),
};

export const NoTeams: Story = {
  render: () => (
    <OrgTeamsFilterWrapper
      teamsData={[]}
      session={mockSessionWithoutOrg}
      initialOrgTeamsType="yours"
    />
  ),
};

export const ManyTeams: Story = {
  render: () => {
    const manyTeams = [
      {
        id: 100,
        name: "Acme Corp",
        isOrg: true,
        logoUrl: "https://cal.com/api/avatar/org.png",
      },
      ...Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        isOrg: false,
        logoUrl: i % 3 === 0 ? null : `https://cal.com/api/avatar/team-${i + 1}.png`,
      })),
    ];
    return (
      <OrgTeamsFilterWrapper
        teamsData={manyTeams}
        session={mockSession}
        initialOrgTeamsType="org"
      />
    );
  },
};

export const LongTeamNames: Story = {
  render: () => {
    const teamsWithLongNames = [
      {
        id: 100,
        name: "Acme Corp",
        isOrg: true,
        logoUrl: "https://cal.com/api/avatar/org.png",
      },
      {
        id: 1,
        name: "Engineering and Product Development Team",
        isOrg: false,
        logoUrl: "https://cal.com/api/avatar/team-1.png",
      },
      {
        id: 2,
        name: "Marketing, Communications, and Brand Strategy",
        isOrg: false,
        logoUrl: "https://cal.com/api/avatar/team-2.png",
      },
      {
        id: 3,
        name: "Sales and Customer Success Division",
        isOrg: false,
        logoUrl: null,
      },
    ];
    return (
      <OrgTeamsFilterWrapper
        teamsData={teamsWithLongNames}
        session={mockSession}
        initialOrgTeamsType="team"
        initialSelectedTeamId={1}
      />
    );
  },
};

export const WithoutAvatars: Story = {
  render: () => {
    const teamsWithoutAvatars = [
      {
        id: 100,
        name: "Acme Corp",
        isOrg: true,
        logoUrl: null,
      },
      {
        id: 1,
        name: "Engineering",
        isOrg: false,
        logoUrl: null,
      },
      {
        id: 2,
        name: "Marketing",
        isOrg: false,
        logoUrl: null,
      },
      {
        id: 3,
        name: "Sales",
        isOrg: false,
        logoUrl: null,
      },
    ];
    const sessionWithoutAvatar = {
      ...mockSession,
      user: {
        ...mockSession.user,
        avatarUrl: null,
      },
    };
    return (
      <OrgTeamsFilterWrapper
        teamsData={teamsWithoutAvatars}
        session={sessionWithoutAvatar}
        initialOrgTeamsType="yours"
      />
    );
  },
};
