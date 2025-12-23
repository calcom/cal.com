import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { EventTypeSelect } from "./EventTypeSelect";

/**
 * Mock event types data for stories
 */
const mockEventTypes = [
  {
    id: 1,
    title: "15 Min Meeting",
    slug: "15min",
    length: 15,
    team: null,
  },
  {
    id: 2,
    title: "30 Min Meeting",
    slug: "30min",
    length: 30,
    team: null,
  },
  {
    id: 3,
    title: "60 Min Meeting",
    slug: "60min",
    length: 60,
    team: null,
  },
  {
    id: 4,
    title: "Discovery Call",
    slug: "discovery-call",
    length: 45,
    team: null,
  },
  {
    id: 5,
    title: "Team Standup",
    slug: "team-standup",
    length: 15,
    team: { id: 1, name: "Engineering Team" },
  },
  {
    id: 6,
    title: "Team Planning Session",
    slug: "team-planning",
    length: 90,
    team: { id: 1, name: "Engineering Team" },
  },
];

/**
 * EventTypeSelect allows users to select from their available event types.
 * It integrates with the troubleshooter store and displays event types with their durations.
 *
 * This component:
 * - Fetches event types via tRPC
 * - Syncs selection with the troubleshooter store
 * - Supports initialization from URL query parameters
 * - Displays both personal and team event types
 */
const meta = {
  component: EventTypeSelect,
  parameters: {
    layout: "centered",
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: mockEventTypes,
          },
        },
      },
    ],
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EventTypeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state showing the event type selector with multiple options.
 */
export const Default: Story = {};

/**
 * Shows the component in a loading state while fetching event types.
 */
export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        delay: 999999, // Simulate infinite loading
      },
    ],
  },
};

/**
 * Shows the component when there are no event types available.
 * The select is disabled in this state.
 */
export const NoEventTypes: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: [],
          },
        },
      },
    ],
  },
};

/**
 * Shows a user with only one event type.
 */
export const SingleEventType: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: [mockEventTypes[0]],
          },
        },
      },
    ],
  },
};

/**
 * Shows only personal event types (no team events).
 */
export const PersonalEventTypesOnly: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: mockEventTypes.filter((e) => !e.team),
          },
        },
      },
    ],
  },
};

/**
 * Shows only team event types.
 */
export const TeamEventTypesOnly: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: mockEventTypes.filter((e) => e.team),
          },
        },
      },
    ],
  },
};

/**
 * Shows a large number of event types to test scrolling behavior.
 */
export const ManyEventTypes: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: [
              ...mockEventTypes,
              {
                id: 7,
                title: "Coffee Chat",
                slug: "coffee-chat",
                length: 30,
                team: null,
              },
              {
                id: 8,
                title: "Quick Sync",
                slug: "quick-sync",
                length: 15,
                team: null,
              },
              {
                id: 9,
                title: "Code Review",
                slug: "code-review",
                length: 45,
                team: { id: 1, name: "Engineering Team" },
              },
              {
                id: 10,
                title: "Product Demo",
                slug: "product-demo",
                length: 60,
                team: { id: 2, name: "Product Team" },
              },
              {
                id: 11,
                title: "Strategy Meeting",
                slug: "strategy-meeting",
                length: 120,
                team: { id: 3, name: "Leadership Team" },
              },
              {
                id: 12,
                title: "1-on-1",
                slug: "one-on-one",
                length: 30,
                team: null,
              },
            ],
          },
        },
      },
    ],
  },
};

/**
 * Shows event types with varying durations from short to long.
 */
export const VariedDurations: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.eventTypes.listWithTeam",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: [
              {
                id: 1,
                title: "Quick Question",
                slug: "quick-question",
                length: 10,
                team: null,
              },
              {
                id: 2,
                title: "Standard Meeting",
                slug: "standard-meeting",
                length: 30,
                team: null,
              },
              {
                id: 3,
                title: "Deep Dive",
                slug: "deep-dive",
                length: 90,
                team: null,
              },
              {
                id: 4,
                title: "Workshop",
                slug: "workshop",
                length: 180,
                team: null,
              },
            ],
          },
        },
      },
    ],
  },
};

/**
 * Example showing the component in a form context with other fields.
 */
export const InFormContext: Story = {
  render: () => (
    <div className="space-y-4 w-[400px]">
      <div className="text-sm font-medium">Schedule a Troubleshooting Session</div>
      <EventTypeSelect />
      <div className="text-subtle text-xs">
        Select an event type to begin troubleshooting availability issues.
      </div>
    </div>
  ),
};
