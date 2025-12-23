import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Loader from "./Loader";

const meta = {
  component: Loader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InContainer: Story = {
  decorators: [
    (Story) => (
      <div className="flex h-32 w-32 items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export const FullPage: Story = {
  decorators: [
    (Story) => (
      <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-gray-200">
        <Story />
      </div>
    ),
  ],
};
