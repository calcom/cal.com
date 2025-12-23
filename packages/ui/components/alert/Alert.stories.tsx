import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Alert } from "./Alert";

const meta = {
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    severity: {
      description: "The severity level of the alert",
      control: { type: "select" },
      options: ["neutral", "info", "warning", "error"],
    },
    title: {
      description: "Optional title for the alert",
      control: "text",
    },
    message: {
      description: "The alert message content",
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
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    severity: "neutral",
    title: "Neutral Alert",
    message: "This is a neutral informational message.",
  },
};

export const Info: Story = {
  args: {
    severity: "info",
    title: "Information",
    message: "This is an informational alert to provide helpful context.",
  },
};

export const Warning: Story = {
  args: {
    severity: "warning",
    title: "Warning",
    message: "This action may have unintended consequences. Please proceed with caution.",
  },
};

export const Error: Story = {
  args: {
    severity: "error",
    title: "Error",
    message: "Something went wrong. Please try again or contact support.",
  },
};

export const WithoutTitle: Story = {
  args: {
    severity: "info",
    message: "This alert has no title, just a message.",
  },
};

export const WithActions: Story = {
  args: {
    severity: "warning",
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    actions: (
      <div className="flex gap-2">
        <Button size="sm" color="minimal">
          Cancel
        </Button>
        <Button size="sm" color="primary">
          Confirm
        </Button>
      </div>
    ),
  },
};

export const WithCustomIcon: Story = {
  args: {
    severity: "info",
    title: "Calendar Sync",
    message: "Your calendar is now synced with Google Calendar.",
    CustomIcon: "calendar",
  },
};

export const AllSeverities: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert severity="neutral" title="Neutral" message="This is a neutral alert." />
      <Alert severity="info" title="Info" message="This is an informational alert." />
      <Alert severity="warning" title="Warning" message="This is a warning alert." />
      <Alert severity="error" title="Error" message="This is an error alert." />
    </div>
  ),
};
