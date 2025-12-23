import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AvatarGroup } from "./AvatarGroup";

const meta = {
  component: AvatarGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleAvatars = [
  { image: "https://i.pravatar.cc/150?img=1", title: "John Doe", alt: "John Doe" },
  { image: "https://i.pravatar.cc/150?img=2", title: "Jane Smith", alt: "Jane Smith" },
  { image: "https://i.pravatar.cc/150?img=3", title: "Bob Wilson", alt: "Bob Wilson" },
  { image: "https://i.pravatar.cc/150?img=4", title: "Alice Johnson", alt: "Alice Johnson" },
  { image: "https://i.pravatar.cc/150?img=5", title: "Charlie Brown", alt: "Charlie Brown" },
  { image: "https://i.pravatar.cc/150?img=6", title: "Diana Prince", alt: "Diana Prince" },
];

export const Small: Story = {
  args: {
    size: "sm",
    items: sampleAvatars.slice(0, 3),
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    items: sampleAvatars.slice(0, 3),
  },
};

export const WithTruncation: Story = {
  args: {
    size: "sm",
    items: sampleAvatars,
    truncateAfter: 4,
  },
};

export const TruncateAfterTwo: Story = {
  args: {
    size: "sm",
    items: sampleAvatars,
    truncateAfter: 2,
  },
};

export const HideTruncatedCount: Story = {
  args: {
    size: "sm",
    items: sampleAvatars,
    truncateAfter: 3,
    hideTruncatedAvatarsCount: true,
  },
};

export const SingleAvatar: Story = {
  args: {
    size: "sm",
    items: [sampleAvatars[0]],
  },
};

export const TeamMembers: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <AvatarGroup
        size="sm"
        items={sampleAvatars.slice(0, 4)}
        truncateAfter={3}
      />
      <span className="text-subtle text-sm">4 team members</span>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-subtle w-12 text-sm">Small:</span>
        <AvatarGroup size="sm" items={sampleAvatars.slice(0, 4)} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-subtle w-12 text-sm">Large:</span>
        <AvatarGroup size="lg" items={sampleAvatars.slice(0, 4)} />
      </div>
    </div>
  ),
};
