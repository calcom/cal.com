import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "./Avatar";

const meta = {
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      description: "Size of the avatar",
      control: { type: "select" },
      options: ["xs", "xsm", "sm", "md", "mdLg", "lg", "xl"],
    },
    shape: {
      description: "Shape of the avatar",
      control: { type: "select" },
      options: ["circle", "square"],
    },
    imageSrc: {
      description: "URL of the avatar image",
      control: "text",
    },
    title: {
      description: "Tooltip text shown on hover",
      control: "text",
    },
    alt: {
      description: "Alt text for the image",
      control: "text",
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleImageUrl = "https://cal.com/stakeholder/peer.jpg";

export const Default: Story = {
  args: {
    alt: "User avatar",
    imageSrc: sampleImageUrl,
    size: "md",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar alt="xs" imageSrc={sampleImageUrl} size="xs" />
      <Avatar alt="xsm" imageSrc={sampleImageUrl} size="xsm" />
      <Avatar alt="sm" imageSrc={sampleImageUrl} size="sm" />
      <Avatar alt="md" imageSrc={sampleImageUrl} size="md" />
      <Avatar alt="mdLg" imageSrc={sampleImageUrl} size="mdLg" />
      <Avatar alt="lg" imageSrc={sampleImageUrl} size="lg" />
      <Avatar alt="xl" imageSrc={sampleImageUrl} size="xl" />
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Avatar alt="Circle" imageSrc={sampleImageUrl} size="lg" shape="circle" />
        <p className="text-xs mt-2">Circle</p>
      </div>
      <div className="text-center">
        <Avatar alt="Square" imageSrc={sampleImageUrl} size="lg" shape="square" />
        <p className="text-xs mt-2">Square</p>
      </div>
    </div>
  ),
};

export const WithTooltip: Story = {
  args: {
    alt: "John Doe",
    imageSrc: sampleImageUrl,
    size: "lg",
    title: "John Doe - Product Manager",
  },
};

export const Fallback: Story = {
  args: {
    alt: "User with no image",
    imageSrc: null,
    size: "lg",
  },
};

export const CustomFallback: Story = {
  args: {
    alt: "Custom fallback",
    imageSrc: null,
    size: "lg",
    fallback: (
      <div className="flex h-full w-full items-center justify-center bg-blue-500 text-white text-lg font-bold">
        JD
      </div>
    ),
  },
};

export const WithIndicator: Story = {
  args: {
    alt: "User with indicator",
    imageSrc: sampleImageUrl,
    size: "lg",
    indicator: (
      <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
    ),
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Circle Avatars</h3>
        <div className="flex items-end gap-4">
          <div className="text-center">
            <Avatar alt="xs" imageSrc={sampleImageUrl} size="xs" />
            <p className="text-[10px] mt-1">xs</p>
          </div>
          <div className="text-center">
            <Avatar alt="xsm" imageSrc={sampleImageUrl} size="xsm" />
            <p className="text-[10px] mt-1">xsm</p>
          </div>
          <div className="text-center">
            <Avatar alt="sm" imageSrc={sampleImageUrl} size="sm" />
            <p className="text-[10px] mt-1">sm</p>
          </div>
          <div className="text-center">
            <Avatar alt="md" imageSrc={sampleImageUrl} size="md" />
            <p className="text-[10px] mt-1">md</p>
          </div>
          <div className="text-center">
            <Avatar alt="mdLg" imageSrc={sampleImageUrl} size="mdLg" />
            <p className="text-[10px] mt-1">mdLg</p>
          </div>
          <div className="text-center">
            <Avatar alt="lg" imageSrc={sampleImageUrl} size="lg" />
            <p className="text-[10px] mt-1">lg</p>
          </div>
          <div className="text-center">
            <Avatar alt="xl" imageSrc={sampleImageUrl} size="xl" />
            <p className="text-[10px] mt-1">xl</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Square Avatars</h3>
        <div className="flex items-end gap-4">
          <div className="text-center">
            <Avatar alt="xs" imageSrc={sampleImageUrl} size="xs" shape="square" />
            <p className="text-[10px] mt-1">xs</p>
          </div>
          <div className="text-center">
            <Avatar alt="xsm" imageSrc={sampleImageUrl} size="xsm" shape="square" />
            <p className="text-[10px] mt-1">xsm</p>
          </div>
          <div className="text-center">
            <Avatar alt="sm" imageSrc={sampleImageUrl} size="sm" shape="square" />
            <p className="text-[10px] mt-1">sm</p>
          </div>
          <div className="text-center">
            <Avatar alt="md" imageSrc={sampleImageUrl} size="md" shape="square" />
            <p className="text-[10px] mt-1">md</p>
          </div>
          <div className="text-center">
            <Avatar alt="mdLg" imageSrc={sampleImageUrl} size="mdLg" shape="square" />
            <p className="text-[10px] mt-1">mdLg</p>
          </div>
          <div className="text-center">
            <Avatar alt="lg" imageSrc={sampleImageUrl} size="lg" shape="square" />
            <p className="text-[10px] mt-1">lg</p>
          </div>
          <div className="text-center">
            <Avatar alt="xl" imageSrc={sampleImageUrl} size="xl" shape="square" />
            <p className="text-[10px] mt-1">xl</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
