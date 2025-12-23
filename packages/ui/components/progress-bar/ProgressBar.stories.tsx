import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProgressBar } from "./ProgressBar";

const meta = {
  component: ProgressBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    color: {
      description: "Color of the progress bar",
      control: { type: "select" },
      options: ["green", "blue", "red", "yellow", "gray"],
    },
    percentageValue: {
      description: "Progress percentage (0-100)",
      control: { type: "range", min: 0, max: 100 },
    },
    label: {
      description: "Optional label to display",
      control: "text",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    percentageValue: 50,
  },
};

export const WithLabel: Story = {
  args: {
    percentageValue: 75,
    label: "75%",
  },
};

export const Colors: Story = {
  render: () => (
    <div className="space-y-4">
      <ProgressBar color="gray" percentageValue={60} label="Gray" />
      <ProgressBar color="blue" percentageValue={60} label="Blue" />
      <ProgressBar color="green" percentageValue={60} label="Green" />
      <ProgressBar color="yellow" percentageValue={60} label="Yellow" />
      <ProgressBar color="red" percentageValue={60} label="Red" />
    </div>
  ),
};

export const ProgressStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-subtle mb-1 text-xs">Empty</p>
        <ProgressBar percentageValue={0} color="blue" />
      </div>
      <div>
        <p className="text-subtle mb-1 text-xs">Quarter</p>
        <ProgressBar percentageValue={25} color="blue" />
      </div>
      <div>
        <p className="text-subtle mb-1 text-xs">Half</p>
        <ProgressBar percentageValue={50} color="blue" />
      </div>
      <div>
        <p className="text-subtle mb-1 text-xs">Three Quarters</p>
        <ProgressBar percentageValue={75} color="blue" />
      </div>
      <div>
        <p className="text-subtle mb-1 text-xs">Complete</p>
        <ProgressBar percentageValue={100} color="green" />
      </div>
    </div>
  ),
};

export const StorageUsage: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-emphasis font-medium">Storage Used</span>
        <span className="text-subtle">7.5 GB of 10 GB</span>
      </div>
      <ProgressBar percentageValue={75} color="blue" />
    </div>
  ),
};

export const UploadProgress: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-emphasis font-medium">Uploading...</span>
        <span className="text-subtle">42%</span>
      </div>
      <ProgressBar percentageValue={42} color="green" />
    </div>
  ),
};

export const QuotaWarning: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-emphasis font-medium">Monthly Bookings</span>
        <span className="text-subtle">95 of 100</span>
      </div>
      <ProgressBar percentageValue={95} color="red" />
      <p className="text-xs text-red-500">You are approaching your booking limit</p>
    </div>
  ),
};
