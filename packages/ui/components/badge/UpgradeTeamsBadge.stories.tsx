import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UpgradeTeamsBadge } from "./UpgradeTeamsBadge";

const meta = {
  component: UpgradeTeamsBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof UpgradeTeamsBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const TrialMode: Story = {
  args: {
    isTrial: true,
  },
};

export const InactiveTeamPlan: Story = {
  args: {
    hasPaidPlan: true,
    checkForActiveStatus: true,
    hasActiveTeamPlan: false,
  },
};

export const ActiveTeamPlan: Story = {
  args: {
    hasPaidPlan: true,
    hasActiveTeamPlan: true,
  },
};

export const WithCheckForActiveStatus: Story = {
  args: {
    checkForActiveStatus: true,
    hasPaidPlan: false,
  },
};
