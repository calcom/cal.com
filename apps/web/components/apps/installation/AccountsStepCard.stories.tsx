import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { AccountsStepCard } from "./AccountsStepCard";

const meta = {
  component: AccountsStepCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
    loading: false,
  },
} satisfies Meta<typeof AccountsStepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: false,
    },
    installableOnTeams: false,
  },
};

export const WithTeams: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: false,
    },
    teams: [
      {
        id: 2,
        name: "Marketing Team",
        logoUrl: "https://cal.com/team-logo.png",
        alreadyInstalled: false,
      },
      {
        id: 3,
        name: "Sales Team",
        logoUrl: "https://cal.com/team-logo-2.png",
        alreadyInstalled: false,
      },
      {
        id: 4,
        name: "Engineering Team",
        logoUrl: "https://cal.com/team-logo-3.png",
        alreadyInstalled: false,
      },
    ],
    installableOnTeams: true,
  },
};

export const PersonalAccountAlreadyInstalled: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: true,
    },
    installableOnTeams: false,
  },
};

export const WithTeamsSomeInstalled: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: false,
    },
    teams: [
      {
        id: 2,
        name: "Marketing Team",
        logoUrl: "https://cal.com/team-logo.png",
        alreadyInstalled: true,
      },
      {
        id: 3,
        name: "Sales Team",
        logoUrl: "https://cal.com/team-logo-2.png",
        alreadyInstalled: false,
      },
      {
        id: 4,
        name: "Engineering Team",
        logoUrl: "https://cal.com/team-logo-3.png",
        alreadyInstalled: true,
      },
    ],
    installableOnTeams: true,
  },
};

export const AllInstalled: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: true,
    },
    teams: [
      {
        id: 2,
        name: "Marketing Team",
        logoUrl: "https://cal.com/team-logo.png",
        alreadyInstalled: true,
      },
      {
        id: 3,
        name: "Sales Team",
        logoUrl: "https://cal.com/team-logo-2.png",
        alreadyInstalled: true,
      },
    ],
    installableOnTeams: true,
  },
};

export const Loading: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "John Doe",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: false,
    },
    teams: [
      {
        id: 2,
        name: "Marketing Team",
        logoUrl: "https://cal.com/team-logo.png",
        alreadyInstalled: false,
      },
      {
        id: 3,
        name: "Sales Team",
        logoUrl: "https://cal.com/team-logo-2.png",
        alreadyInstalled: false,
      },
    ],
    installableOnTeams: true,
    loading: true,
  },
};

export const NoAvatar: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "Jane Smith",
      avatarUrl: null,
      alreadyInstalled: false,
    },
    teams: [
      {
        id: 2,
        name: "Product Team",
        logoUrl: null,
        alreadyInstalled: false,
      },
    ],
    installableOnTeams: true,
  },
};

export const LongTeamNames: Story = {
  args: {
    personalAccount: {
      id: 1,
      name: "Alexander Maximilian Vanderbilt III",
      avatarUrl: "https://cal.com/avatar.png",
      alreadyInstalled: false,
    },
    teams: [
      {
        id: 2,
        name: "Enterprise Solutions and Digital Transformation Team",
        logoUrl: "https://cal.com/team-logo.png",
        alreadyInstalled: false,
      },
      {
        id: 3,
        name: "Customer Success and Support Operations Division",
        logoUrl: "https://cal.com/team-logo-2.png",
        alreadyInstalled: true,
      },
    ],
    installableOnTeams: true,
  },
};
