import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { AssignFeatureSheet } from "./AssignFeatureSheet";

// Mock flag type
type Flag = RouterOutputs["viewer"]["features"]["list"][number];

// Mock team type
type Team = {
  id: number;
  name: string | null;
  slug: string | null;
  logoUrl: string | null;
  hasFeature: boolean;
  isOrganization: boolean;
  parent: {
    name: string | null;
    logoUrl: string | null;
  } | null;
  parentId: number | null;
};

// Mock TRPC module
jest.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: jest.fn(),
    viewer: {
      admin: {
        getTeamsForFeature: {
          useInfiniteQuery: jest.fn(),
        },
        assignFeatureToTeam: {
          useMutation: jest.fn(),
        },
        unassignFeatureFromTeam: {
          useMutation: jest.fn(),
        },
      },
    },
  },
}));

const { trpc } = require("@calcom/trpc/react");

// Mock utils
const mockUtils = {
  viewer: {
    admin: {
      getTeamsForFeature: {
        invalidate: jest.fn(),
      },
    },
  },
};

// Mock flag data helper
const createMockFlag = (overrides?: Partial<Flag>): Flag => ({
  slug: "example-feature",
  description: "An example feature flag for testing",
  enabled: true,
  type: "EXPERIMENT",
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

// Mock team data helper
const createMockTeam = (overrides?: Partial<Team>): Team => ({
  id: 1,
  name: "Engineering",
  slug: "engineering",
  logoUrl: "https://cal.com/api/avatar/team-1.png",
  hasFeature: false,
  isOrganization: false,
  parent: null,
  parentId: null,
  ...overrides,
});

// Wrapper component for interactive stories
function AssignFeatureSheetWrapper({
  flag,
  teams,
  hasNextPage = false,
  isPending = false,
}: {
  flag: Flag;
  teams: Team[];
  hasNextPage?: boolean;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [teamStates, setTeamStates] = useState<Record<number, boolean>>(
    teams.reduce((acc, team) => ({ ...acc, [team.id]: team.hasFeature }), {})
  );

  // Mock useUtils
  trpc.useUtils.mockReturnValue(mockUtils);

  // Mock useInfiniteQuery
  trpc.viewer.admin.getTeamsForFeature.useInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        {
          teams: teams.map((team) => ({
            ...team,
            hasFeature: teamStates[team.id] ?? team.hasFeature,
          })),
          nextCursor: hasNextPage ? "next-cursor" : undefined,
        },
      ],
    },
    fetchNextPage: jest.fn(),
    hasNextPage,
    isFetchingNextPage: false,
    isPending,
  });

  // Mock assignFeatureToTeam mutation
  trpc.viewer.admin.assignFeatureToTeam.useMutation.mockReturnValue({
    mutate: jest.fn(({ teamId }) => {
      console.log("Assigning feature to team:", teamId);
      setTeamStates((prev) => ({ ...prev, [teamId]: true }));
    }),
    isPending: false,
  });

  // Mock unassignFeatureFromTeam mutation
  trpc.viewer.admin.unassignFeatureFromTeam.useMutation.mockReturnValue({
    mutate: jest.fn(({ teamId }) => {
      console.log("Unassigning feature from team:", teamId);
      setTeamStates((prev) => ({ ...prev, [teamId]: false }));
    }),
    isPending: false,
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Assign Feature Sheet</Button>
      <AssignFeatureSheet flag={flag} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  component: AssignFeatureSheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssignFeatureSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "new-dashboard",
        description: "New dashboard layout with improved analytics",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Engineering",
          slug: "engineering",
          hasFeature: false,
        }),
        createMockTeam({
          id: 2,
          name: "Marketing",
          slug: "marketing",
          hasFeature: true,
        }),
        createMockTeam({
          id: 3,
          name: "Sales",
          slug: "sales",
          hasFeature: false,
        }),
      ]}
    />
  ),
};

export const WithOrganizations: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "advanced-analytics",
        description: "Advanced analytics and reporting features",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Acme Corp",
          slug: "acme-corp",
          logoUrl: "https://cal.com/api/avatar/org.png",
          hasFeature: true,
          isOrganization: true,
        }),
        createMockTeam({
          id: 2,
          name: "Engineering",
          slug: "engineering",
          hasFeature: false,
          isOrganization: false,
          parent: {
            name: "Acme Corp",
            logoUrl: "https://cal.com/api/avatar/org.png",
          },
          parentId: 1,
        }),
        createMockTeam({
          id: 3,
          name: "Marketing",
          slug: "marketing",
          hasFeature: true,
          isOrganization: false,
          parent: {
            name: "Acme Corp",
            logoUrl: "https://cal.com/api/avatar/org.png",
          },
          parentId: 1,
        }),
      ]}
    />
  ),
};

export const WithoutAvatars: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "team-collaboration",
        description: "Enhanced team collaboration tools",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Engineering",
          slug: "engineering",
          logoUrl: null,
          hasFeature: false,
        }),
        createMockTeam({
          id: 2,
          name: "Marketing",
          slug: "marketing",
          logoUrl: null,
          hasFeature: true,
        }),
        createMockTeam({
          id: 3,
          name: "Design",
          slug: "design",
          logoUrl: null,
          hasFeature: false,
        }),
      ]}
    />
  ),
};

export const AllTeamsAssigned: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "premium-features",
        description: "Premium features for all teams",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Engineering",
          slug: "engineering",
          hasFeature: true,
        }),
        createMockTeam({
          id: 2,
          name: "Marketing",
          slug: "marketing",
          hasFeature: true,
        }),
        createMockTeam({
          id: 3,
          name: "Sales",
          slug: "sales",
          hasFeature: true,
        }),
      ]}
    />
  ),
};

export const NoTeamsAssigned: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "experimental-feature",
        description: "New experimental feature in testing",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Engineering",
          slug: "engineering",
          hasFeature: false,
        }),
        createMockTeam({
          id: 2,
          name: "Marketing",
          slug: "marketing",
          hasFeature: false,
        }),
        createMockTeam({
          id: 3,
          name: "Sales",
          slug: "sales",
          hasFeature: false,
        }),
      ]}
    />
  ),
};

export const ManyTeams: Story = {
  render: () => {
    const teams = Array.from({ length: 20 }, (_, i) => {
      const isOrg = i === 0;
      return createMockTeam({
        id: i + 1,
        name: isOrg ? "Acme Corporation" : `Team ${i}`,
        slug: isOrg ? "acme-corp" : `team-${i}`,
        logoUrl: i % 3 === 0 ? null : `https://cal.com/api/avatar/team-${i}.png`,
        hasFeature: i % 4 === 0,
        isOrganization: isOrg,
        parent: !isOrg && i <= 10 ? { name: "Acme Corporation", logoUrl: null } : null,
        parentId: !isOrg && i <= 10 ? 1 : null,
      });
    });

    return (
      <AssignFeatureSheetWrapper
        flag={createMockFlag({
          slug: "scalable-feature",
          description: "Feature with many team assignments",
        })}
        teams={teams}
        hasNextPage={true}
      />
    );
  },
};

export const LongTeamNames: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "ui-improvements",
        description: "User interface improvements and refinements",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Engineering and Product Development Team",
          slug: "engineering-product-dev",
          hasFeature: false,
        }),
        createMockTeam({
          id: 2,
          name: "Marketing, Communications, and Brand Strategy Division",
          slug: "marketing-comms-brand",
          hasFeature: true,
        }),
        createMockTeam({
          id: 3,
          name: "Sales and Customer Success Operations",
          slug: "sales-customer-success",
          hasFeature: false,
        }),
      ]}
    />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "new-feature",
        description: "A brand new feature with no teams yet",
      })}
      teams={[]}
    />
  ),
};

export const LoadingState: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "loading-feature",
        description: "Loading teams for this feature",
      })}
      teams={[]}
      isPending={true}
    />
  ),
};

export const MixedOrganizationStructure: Story = {
  render: () => (
    <AssignFeatureSheetWrapper
      flag={createMockFlag({
        slug: "org-structure-feature",
        description: "Feature with complex organizational structure",
      })}
      teams={[
        createMockTeam({
          id: 1,
          name: "Global Corporation",
          slug: "global-corp",
          logoUrl: "https://cal.com/api/avatar/org-1.png",
          hasFeature: true,
          isOrganization: true,
        }),
        createMockTeam({
          id: 2,
          name: "North America Division",
          slug: "north-america",
          logoUrl: "https://cal.com/api/avatar/org-2.png",
          hasFeature: false,
          isOrganization: true,
        }),
        createMockTeam({
          id: 3,
          name: "Engineering - NA",
          slug: "engineering-na",
          logoUrl: null,
          hasFeature: true,
          isOrganization: false,
          parent: {
            name: "North America Division",
            logoUrl: "https://cal.com/api/avatar/org-2.png",
          },
          parentId: 2,
        }),
        createMockTeam({
          id: 4,
          name: "Sales - NA",
          slug: "sales-na",
          hasFeature: false,
          isOrganization: false,
          parent: {
            name: "North America Division",
            logoUrl: "https://cal.com/api/avatar/org-2.png",
          },
          parentId: 2,
        }),
        createMockTeam({
          id: 5,
          name: "Independent Team",
          slug: "independent",
          hasFeature: true,
          isOrganization: false,
        }),
      ]}
    />
  ),
};
