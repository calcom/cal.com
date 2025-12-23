import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { SessionProvider } from "next-auth/react";
import { fn } from "storybook/test";

import { TeamsFilter } from "./TeamsFilter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock teams data
const mockTeams = [
  {
    id: 1,
    name: "Engineering Team",
    slug: "engineering",
    logoUrl: null,
    isOrganization: false,
  },
  {
    id: 2,
    name: "Design Team",
    slug: "design",
    logoUrl: null,
    isOrganization: false,
  },
  {
    id: 3,
    name: "Marketing Team",
    slug: "marketing",
    logoUrl: null,
    isOrganization: false,
  },
  {
    id: 4,
    name: "Sales Team",
    slug: "sales",
    logoUrl: null,
    isOrganization: false,
  },
  {
    id: 5,
    name: "Product Team",
    slug: "product",
    logoUrl: null,
    isOrganization: false,
  },
];

// Mock session data
const mockSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    username: "johndoe",
  },
  upId: "user-profile-1",
};

// Mock tRPC client
const mockTrpc = createTRPCReact<any>();

const createMockTrpcClient = (teams = mockTeams) =>
  mockTrpc.createClient({
    links: [
      () =>
        ({ op }) => {
          return {
            subscribe: (observer: any) => {
              // Mock the teams.list query
              if (op.path === "viewer.teams.list") {
                observer.next({
                  result: {
                    data: teams,
                  },
                });
              } else {
                observer.next({
                  result: {
                    data: {},
                  },
                });
              }
              observer.complete();
              return {
                unsubscribe: () => {},
              };
            },
          } as any;
        },
    ],
  });

const meta = {
  component: TeamsFilter,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story, context) => {
      const mockTrpcClient = createMockTrpcClient(context.args.mockTeams || mockTeams);
      return (
        <SessionProvider session={context.args.mockSession || mockSession}>
          <mockTrpc.Provider client={mockTrpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <div style={{ padding: "50px", minWidth: "300px" }}>
                <Story />
              </div>
            </QueryClientProvider>
          </mockTrpc.Provider>
        </SessionProvider>
      );
    },
  ],
  argTypes: {
    popoverTriggerClassNames: {
      description: "Custom CSS classes for the popover trigger button",
      control: "text",
    },
    useProfileFilter: {
      description: "Whether to use profile filter (upIds) instead of user filter (userIds)",
      control: "boolean",
    },
    showVerticalDivider: {
      description: "Whether to show a vertical divider after the filter",
      control: "boolean",
    },
    mockTeams: {
      description: "Mock teams data for Storybook",
      control: "object",
      table: {
        disable: true,
      },
    },
    mockSession: {
      description: "Mock session data for Storybook",
      control: "object",
      table: {
        disable: true,
      },
    },
  },
} satisfies Meta<typeof TeamsFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams,
    mockSession,
  },
};

export const WithVerticalDivider: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: true,
    mockTeams,
    mockSession,
  },
};

export const WithProfileFilter: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: true,
    showVerticalDivider: false,
    mockTeams,
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Uses profile filter (upIds) instead of user filter (userIds) for filtering.",
      },
    },
  },
};

export const CustomTriggerClassNames: Story = {
  args: {
    popoverTriggerClassNames: "bg-blue-500 text-white hover:bg-blue-600",
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams,
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Custom styling applied to the popover trigger button.",
      },
    },
  },
};

export const FewTeams: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [
      {
        id: 1,
        name: "Engineering Team",
        slug: "engineering",
        logoUrl: null,
        isOrganization: false,
      },
      {
        id: 2,
        name: "Design Team",
        slug: "design",
        logoUrl: null,
        isOrganization: false,
      },
    ],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Filter with only a few teams available.",
      },
    },
  },
};

export const ManyTeams: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [
      { id: 1, name: "Engineering Team", slug: "engineering", logoUrl: null, isOrganization: false },
      { id: 2, name: "Design Team", slug: "design", logoUrl: null, isOrganization: false },
      { id: 3, name: "Marketing Team", slug: "marketing", logoUrl: null, isOrganization: false },
      { id: 4, name: "Sales Team", slug: "sales", logoUrl: null, isOrganization: false },
      { id: 5, name: "Product Team", slug: "product", logoUrl: null, isOrganization: false },
      { id: 6, name: "Customer Success Team", slug: "customer-success", logoUrl: null, isOrganization: false },
      { id: 7, name: "Operations Team", slug: "operations", logoUrl: null, isOrganization: false },
      { id: 8, name: "Finance Team", slug: "finance", logoUrl: null, isOrganization: false },
      { id: 9, name: "HR Team", slug: "hr", logoUrl: null, isOrganization: false },
      { id: 10, name: "Legal Team", slug: "legal", logoUrl: null, isOrganization: false },
    ],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Filter with many teams showing scrollable list and search functionality.",
      },
    },
  },
};

export const TeamsWithLogos: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [
      {
        id: 1,
        name: "Engineering Team",
        slug: "engineering",
        logoUrl: "https://avatars.githubusercontent.com/u/1?v=4",
        isOrganization: false,
      },
      {
        id: 2,
        name: "Design Team",
        slug: "design",
        logoUrl: "https://avatars.githubusercontent.com/u/2?v=4",
        isOrganization: false,
      },
      {
        id: 3,
        name: "Marketing Team",
        slug: "marketing",
        logoUrl: "https://avatars.githubusercontent.com/u/3?v=4",
        isOrganization: false,
      },
    ],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Teams with custom avatar logos displayed in the filter.",
      },
    },
  },
};

export const NoTeams: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "When no teams are available, the component returns null and renders nothing.",
      },
    },
  },
};

export const WithOrganizationFiltered: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [
      {
        id: 1,
        name: "Acme Organization",
        slug: "acme",
        logoUrl: null,
        isOrganization: true,
      },
      {
        id: 2,
        name: "Engineering Team",
        slug: "engineering",
        logoUrl: null,
        isOrganization: false,
      },
      {
        id: 3,
        name: "Design Team",
        slug: "design",
        logoUrl: null,
        isOrganization: false,
      },
    ],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Organizations are automatically filtered out from the teams list, only showing actual teams.",
      },
    },
  },
};

export const LongTeamNames: Story = {
  args: {
    popoverTriggerClassNames: undefined,
    useProfileFilter: false,
    showVerticalDivider: false,
    mockTeams: [
      {
        id: 1,
        name: "Engineering and Development Team for Product Infrastructure",
        slug: "engineering-long",
        logoUrl: null,
        isOrganization: false,
      },
      {
        id: 2,
        name: "User Experience and Interface Design Department",
        slug: "design-long",
        logoUrl: null,
        isOrganization: false,
      },
      {
        id: 3,
        name: "Marketing and Brand Communications Division",
        slug: "marketing-long",
        logoUrl: null,
        isOrganization: false,
      },
    ],
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "Teams with long names demonstrating text truncation and tooltip functionality.",
      },
    },
  },
};

export const CompleteConfiguration: Story = {
  args: {
    popoverTriggerClassNames: "border-2 border-blue-300",
    useProfileFilter: true,
    showVerticalDivider: true,
    mockTeams,
    mockSession,
  },
  parameters: {
    docs: {
      description: {
        story: "All options enabled: custom classes, profile filter, and vertical divider.",
      },
    },
  },
};
