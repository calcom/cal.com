import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { ProgressToast } from "./ProgressToast";

const meta = {
  component: ProgressToast,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    progress: 45,
    toastId: "progress-1",
    onClose: fn(),
  },
};

export const Starting: Story = {
  args: {
    message: "Starting download...",
    progress: 5,
    toastId: "progress-2",
    onClose: fn(),
  },
};

export const Halfway: Story = {
  args: {
    message: "Downloading file...",
    progress: 50,
    toastId: "progress-3",
    onClose: fn(),
  },
};

export const AlmostComplete: Story = {
  args: {
    message: "Almost done...",
    progress: 95,
    toastId: "progress-4",
    onClose: fn(),
  },
};

export const Complete: Story = {
  args: {
    message: "Download complete!",
    progress: 100,
    toastId: "progress-5",
    onClose: fn(),
  },
};

export const CustomMessage: Story = {
  args: {
    message: "Exporting calendar data...",
    progress: 67,
    toastId: "progress-6",
    onClose: fn(),
  },
};

export const ProgressStates: Story = {
  render: () => (
    <div className="space-y-4">
      <ProgressToast message="Starting..." progress={10} toastId="p1" onClose={fn()} />
      <ProgressToast message="In progress..." progress={50} toastId="p2" onClose={fn()} />
      <ProgressToast message="Almost there..." progress={85} toastId="p3" onClose={fn()} />
    </div>
  ),
};
