import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Spinner } from "./Spinner";

const meta = {
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-8 w-8",
  },
};

export const Small: Story = {
  args: {
    className: "h-4 w-4",
  },
};

export const Large: Story = {
  args: {
    className: "h-12 w-12",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="h-4 w-4" />
      <Spinner className="h-6 w-6" />
      <Spinner className="h-8 w-8" />
      <Spinner className="h-12 w-12" />
      <Spinner className="h-16 w-16" />
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <button className="bg-brand-default text-brand flex items-center gap-2 rounded-md px-4 py-2">
      <Spinner className="h-4 w-4" />
      Loading...
    </button>
  ),
};
