import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OrgBanner } from "./OrgBanner";

const meta = {
  component: OrgBanner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrgBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageSrc: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1500&h=500&fit=crop",
    alt: "Organization Banner",
    className: "w-full h-32 object-cover rounded-lg",
  },
};

export const WithFallback: Story = {
  args: {
    alt: "Organization Banner",
    className: "w-full h-32 rounded-lg",
    fallback: (
      <div className="flex h-full items-center justify-center">
        <span className="text-subtle text-sm">No banner image</span>
      </div>
    ),
  },
};

export const CustomDimensions: Story = {
  args: {
    imageSrc: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=200&fit=crop",
    alt: "Wide Banner",
    width: 800,
    height: 200,
    className: "w-full object-cover rounded-lg",
  },
};

export const NoImage: Story = {
  args: {
    alt: "Missing Banner",
    className: "w-full h-32 rounded-lg",
  },
};

export const WithGradientFallback: Story = {
  args: {
    alt: "Organization Banner",
    className: "w-full h-32 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500",
    fallback: (
      <div className="flex h-full items-center justify-center text-white">
        <span className="text-lg font-semibold">Cal.com Team</span>
      </div>
    ),
  },
};
