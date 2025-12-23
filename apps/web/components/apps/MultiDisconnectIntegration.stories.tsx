import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { MultiDisconnectIntegration } from "./MultiDisconnectIntegration";

const meta = {
  title: "Apps/MultiDisconnectIntegration",
  component: MultiDisconnectIntegration,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    credentials: {
      description: "Array of credential objects to display in the disconnect dropdown",
      control: "object",
    },
    onSuccess: {
      description: "Callback function called when disconnection is successful",
      control: false,
    },
  },
} satisfies Meta<typeof MultiDisconnectIntegration>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock credentials data
const mockPersonalCredentials = [
  {
    id: 1,
    type: "google_calendar",
    key: {},
    userId: 101,
    teamId: null,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: {
      id: 101,
      name: "John Doe",
      email: "john.doe@example.com",
    },
    team: null,
    invalid: false,
  },
  {
    id: 2,
    type: "google_calendar",
    key: {},
    userId: 102,
    teamId: null,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: {
      id: 102,
      name: "Jane Smith",
      email: "jane.smith@example.com",
    },
    team: null,
    invalid: false,
  },
];

const mockTeamCredentials = [
  {
    id: 3,
    type: "google_calendar",
    key: {},
    userId: null,
    teamId: 201,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: null,
    team: {
      id: 201,
      name: "Engineering Team",
    },
    invalid: false,
  },
  {
    id: 4,
    type: "google_calendar",
    key: {},
    userId: null,
    teamId: 202,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: null,
    team: {
      id: 202,
      name: "Marketing Team",
    },
    invalid: false,
  },
];

const mockMixedCredentials = [
  ...mockPersonalCredentials.slice(0, 1),
  ...mockTeamCredentials.slice(0, 1),
];

const mockCredentialWithoutName = [
  {
    id: 5,
    type: "google_calendar",
    key: {},
    userId: 103,
    teamId: null,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: {
      id: 103,
      email: "nousername@example.com",
    },
    team: null,
    invalid: false,
  },
];

const mockCredentialWithOnlyEmail = [
  {
    id: 6,
    type: "google_calendar",
    key: {},
    userId: 104,
    teamId: null,
    appId: "google-calendar",
    subscriptionId: null,
    paymentStatus: null,
    billingCycleStart: null,
    user: {
      id: 104,
      name: "",
      email: "emailonly@example.com",
    },
    team: null,
    invalid: false,
  },
];

export const Default: Story = {
  args: {
    credentials: mockPersonalCredentials,
    onSuccess: fn(),
  },
};

export const PersonalCredentials: Story = {
  args: {
    credentials: mockPersonalCredentials,
    onSuccess: fn(),
  },
};

export const TeamCredentials: Story = {
  args: {
    credentials: mockTeamCredentials,
    onSuccess: fn(),
  },
};

export const MixedCredentials: Story = {
  args: {
    credentials: mockMixedCredentials,
    onSuccess: fn(),
  },
};

export const SingleCredential: Story = {
  args: {
    credentials: mockPersonalCredentials.slice(0, 1),
    onSuccess: fn(),
  },
};

export const WithoutUserName: Story = {
  args: {
    credentials: mockCredentialWithoutName,
    onSuccess: fn(),
  },
};

export const WithOnlyEmail: Story = {
  args: {
    credentials: mockCredentialWithOnlyEmail,
    onSuccess: fn(),
  },
};

export const EmptyCredentials: Story = {
  args: {
    credentials: [],
    onSuccess: fn(),
  },
};

export const ManyCredentials: Story = {
  args: {
    credentials: [
      ...mockPersonalCredentials,
      ...mockTeamCredentials,
      {
        id: 7,
        type: "google_calendar",
        key: {},
        userId: 105,
        teamId: null,
        appId: "google-calendar",
        subscriptionId: null,
        paymentStatus: null,
        billingCycleStart: null,
        user: {
          id: 105,
          name: "Alice Johnson",
          email: "alice.j@example.com",
        },
        team: null,
        invalid: false,
      },
      {
        id: 8,
        type: "google_calendar",
        key: {},
        userId: null,
        teamId: 203,
        appId: "google-calendar",
        subscriptionId: null,
        paymentStatus: null,
        billingCycleStart: null,
        user: null,
        team: {
          id: 203,
          name: "Sales Team",
        },
        invalid: false,
      },
    ],
    onSuccess: fn(),
  },
};
