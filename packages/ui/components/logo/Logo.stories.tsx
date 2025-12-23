import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Logo } from "./Logo";

const meta = {
  component: Logo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    small: {
      description: "Use smaller logo size",
      control: "boolean",
    },
    icon: {
      description: "Show icon only instead of full logo",
      control: "boolean",
    },
    inline: {
      description: "Display logo inline",
      control: "boolean",
    },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://cal.com/logo.svg",
  },
};

export const Small: Story = {
  args: {
    small: true,
    src: "https://cal.com/logo.svg",
  },
};

export const IconOnly: Story = {
  args: {
    icon: true,
    src: "https://cal.com/logo.svg",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <p className="text-subtle mb-2 text-xs">Default</p>
        <Logo src="https://cal.com/logo.svg" />
      </div>
      <div className="text-center">
        <p className="text-subtle mb-2 text-xs">Small</p>
        <Logo small src="https://cal.com/logo.svg" />
      </div>
      <div className="text-center">
        <p className="text-subtle mb-2 text-xs">Icon Only</p>
        <Logo icon src="https://cal.com/logo.svg" />
      </div>
    </div>
  ),
};

export const InNavbar: Story = {
  render: () => (
    <div className="border-subtle flex w-[600px] items-center justify-between rounded-lg border p-4">
      <Logo src="https://cal.com/logo.svg" />
      <div className="flex gap-4">
        <span className="text-subtle text-sm">Features</span>
        <span className="text-subtle text-sm">Pricing</span>
        <span className="text-subtle text-sm">About</span>
      </div>
    </div>
  ),
};
