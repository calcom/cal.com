import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UpgradeOrgsBadge } from "./UpgradeOrgsBadge";

const meta = {
  component: UpgradeOrgsBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof UpgradeOrgsBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
