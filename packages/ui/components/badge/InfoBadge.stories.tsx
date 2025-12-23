import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { InfoBadge } from "./InfoBadge";

const meta = {
  component: InfoBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InfoBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "This is helpful information about the feature",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <span className="text-emphasis text-sm font-medium">Buffer time</span>
      <InfoBadge content="Add buffer time before and after your meetings" />
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    content:
      "This is a longer explanation that provides more detailed information about the feature and how it works in practice.",
  },
};

export const MultipleInfoBadges: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <span className="text-emphasis text-sm font-medium">Start time</span>
        <InfoBadge content="The time when your availability starts" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-emphasis text-sm font-medium">End time</span>
        <InfoBadge content="The time when your availability ends" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-emphasis text-sm font-medium">Minimum notice</span>
        <InfoBadge content="Minimum time before a meeting can be booked" />
      </div>
    </div>
  ),
};
