import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { AppCardApp } from "@calcom/app-store/types";

import { AppList } from "./AppList";

const meta = {
  component: AppList,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data helpers
const createMockApp = (overrides?: Partial<AppCardApp>): AppCardApp => {
  const baseApp = {
    name: "Zoom",
    slug: "zoom",
    type: "zoom_video",
    variant: "conferencing",
    logo: "/api/app-store/zoomvideo/icon.svg",
    description: "Video conferencing platform for online meetings and webinars.",
    publisher: "Zoom Video Communications",
    url: "https://zoom.us",
    email: "support@zoom.us",
    categories: ["video" as const],
    userCredentialIds: [1],
    invalidCredentialIds: [],
    teams: [],
    isInstalled: true,
    dependencyData: [],
    dirName: "zoomvideo",
    ...overrides,
  } as AppCardApp;
  return baseApp;
};

const mockHandleDisconnect = fn();
const mockHandleUpdateUserDefaultConferencingApp = fn();
const mockHandleBulkUpdateDefaultLocation = fn();
const mockHandleConnectDisconnectIntegrationMenuToggle = fn();
const mockHandleBulkEditDialogToggle = fn();

const defaultArgs = {
  handleDisconnect: mockHandleDisconnect,
  handleUpdateUserDefaultConferencingApp: mockHandleUpdateUserDefaultConferencingApp,
  handleBulkUpdateDefaultLocation: mockHandleBulkUpdateDefaultLocation,
  handleConnectDisconnectIntegrationMenuToggle: mockHandleConnectDisconnectIntegrationMenuToggle,
  handleBulkEditDialogToggle: mockHandleBulkEditDialogToggle,
  defaultConferencingApp: {
    appSlug: "daily-video",
    appLink: null,
  },
  isBulkUpdateDefaultLocationPending: false,
  eventTypes: [],
  isEventTypesFetching: false,
};

export const Default: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing for online meetings",
          userCredentialIds: [1],
        }),
        createMockApp({
          name: "Google Meet",
          slug: "google-meet",
          logo: "/api/app-store/googlevideo/icon.svg",
          description: "Google's video conferencing solution",
          userCredentialIds: [2],
        }),
        createMockApp({
          name: "Microsoft Teams",
          slug: "msteams",
          logo: "/api/app-store/office365video/icon.svg",
          description: "Microsoft's collaboration platform",
          userCredentialIds: [3],
        }),
      ],
    },
  },
};

export const ConferencingApps: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Cal Video",
          slug: "daily-video",
          logo: "/api/app-store/daily-video/icon.svg",
          description: "Cal.com's built-in video conferencing solution",
          userCredentialIds: [1],
          isGlobal: true,
        }),
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [2],
        }),
        createMockApp({
          name: "Google Meet",
          slug: "google-meet",
          logo: "/api/app-store/googlevideo/icon.svg",
          description: "Google's video conferencing solution",
          userCredentialIds: [3],
        }),
      ],
    },
    defaultConferencingApp: {
      appSlug: "daily-video",
      appLink: null,
    },
  },
};

export const WithDefaultApp: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
        }),
      ],
    },
    defaultConferencingApp: {
      appSlug: "zoom",
      appLink: null,
    },
  },
};

export const WithInvalidCredentials: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Google Calendar",
          slug: "google-calendar",
          logo: "/api/app-store/google-calendar/icon.svg",
          description: "Sync your Google Calendar",
          userCredentialIds: [1],
          invalidCredentialIds: [1],
        }),
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [2],
        }),
      ],
    },
  },
};

export const WithTeamCredentials: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
          teams: [
            {
              teamId: 1,
              name: "Engineering Team",
              logoUrl: null,
              credentialId: 10,
              isAdmin: true,
            },
            {
              teamId: 2,
              name: "Sales Team",
              logoUrl: "/team-logo.png",
              credentialId: 11,
              isAdmin: false,
            },
          ],
        }),
      ],
    },
  },
};

export const WithReadOnlyTeamCredentials: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Google Meet",
          slug: "google-meet",
          logo: "/api/app-store/googlevideo/icon.svg",
          description: "Google's video conferencing solution",
          userCredentialIds: [],
          teams: [
            {
              teamId: 1,
              name: "Engineering Team",
              logoUrl: null,
              credentialId: 10,
              isAdmin: false,
            },
          ],
        }),
      ],
    },
  },
};

export const MixedApps: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Cal Video",
          slug: "daily-video",
          logo: "/api/app-store/daily-video/icon.svg",
          description: "Cal.com's built-in video conferencing",
          userCredentialIds: [1],
          isGlobal: true,
        }),
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [2],
          teams: [
            {
              teamId: 1,
              name: "Engineering Team",
              logoUrl: null,
              credentialId: 10,
              isAdmin: true,
            },
          ],
        }),
        createMockApp({
          name: "Google Meet",
          slug: "google-meet",
          logo: "/api/app-store/googlevideo/icon.svg",
          description: "Google's video conferencing",
          userCredentialIds: [3],
          invalidCredentialIds: [3],
        }),
        createMockApp({
          name: "Microsoft Teams",
          slug: "msteams",
          logo: "/api/app-store/office365video/icon.svg",
          description: "Microsoft's collaboration platform",
          userCredentialIds: [],
          teams: [
            {
              teamId: 2,
              name: "Sales Team",
              logoUrl: null,
              credentialId: 11,
              isAdmin: false,
            },
          ],
        }),
      ],
    },
    defaultConferencingApp: {
      appSlug: "daily-video",
      appLink: null,
    },
  },
};

export const EmptyList: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [],
    },
  },
};

export const SingleApp: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform for online meetings and webinars",
          userCredentialIds: [1],
        }),
      ],
    },
  },
};

export const WithEventTypes: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
        }),
      ],
    },
    eventTypes: [
      {
        id: 1,
        title: "30 Min Meeting",
        slug: "30min",
        length: 30,
      },
      {
        id: 2,
        title: "Discovery Call",
        slug: "discovery",
        length: 60,
      },
    ],
  },
};

export const LoadingEventTypes: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
        }),
      ],
    },
    isEventTypesFetching: true,
  },
};

export const WithCustomClassName: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
        }),
        createMockApp({
          name: "Google Meet",
          slug: "google-meet",
          logo: "/api/app-store/googlevideo/icon.svg",
          description: "Google's video conferencing solution",
          userCredentialIds: [2],
        }),
      ],
    },
    listClassName: "border-2 border-blue-500 rounded-lg p-4",
  },
};

export const MultipleTeamInstallations: Story = {
  args: {
    ...defaultArgs,
    variant: "conferencing",
    data: {
      items: [
        createMockApp({
          name: "Zoom",
          slug: "zoom",
          logo: "/api/app-store/zoomvideo/icon.svg",
          description: "Video conferencing platform",
          userCredentialIds: [1],
          teams: [
            {
              teamId: 1,
              name: "Engineering Team",
              logoUrl: null,
              credentialId: 10,
              isAdmin: true,
            },
            {
              teamId: 2,
              name: "Marketing Team",
              logoUrl: null,
              credentialId: 11,
              isAdmin: true,
            },
            {
              teamId: 3,
              name: "Sales Team",
              logoUrl: null,
              credentialId: 12,
              isAdmin: false,
            },
          ],
        }),
      ],
    },
  },
};

export const GlobalApp: Story = {
  args: {
    ...defaultArgs,
    data: {
      items: [
        createMockApp({
          name: "Cal Video",
          slug: "daily-video",
          logo: "/api/app-store/daily-video/icon.svg",
          description: "Cal.com's built-in video conferencing solution",
          userCredentialIds: [],
          isGlobal: true,
          teams: [],
        }),
      ],
    },
  },
};
