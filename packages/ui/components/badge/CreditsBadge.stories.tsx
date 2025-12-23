import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CreditsBadge } from "./CreditsBadge";

const meta = {
  component: CreditsBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CreditsBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const ForTeam: Story = {
  args: {
    teamId: 123,
    isOrganization: false,
  },
};

export const ForOrganization: Story = {
  args: {
    teamId: 456,
    isOrganization: true,
  },
};
