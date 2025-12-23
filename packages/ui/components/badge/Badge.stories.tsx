import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Badge } from "./Badge";

const meta = {
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      description: "The visual style variant of the badge",
      control: { type: "select" },
      options: ["default", "warning", "success", "gray", "blue", "red", "error", "green", "orange", "purple"],
    },
    size: {
      description: "Size of the badge",
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    rounded: {
      description: "Whether the badge should be fully rounded (circular)",
      control: "boolean",
    },
    withDot: {
      description: "Show a dot indicator before the text",
      control: "boolean",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="gray">Gray</Badge>
      <Badge variant="blue">Blue</Badge>
      <Badge variant="purple">Purple</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" withDot>
        Active
      </Badge>
      <Badge variant="warning" withDot>
        Pending
      </Badge>
      <Badge variant="error" withDot>
        Offline
      </Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" startIcon="check">
        Confirmed
      </Badge>
      <Badge variant="warning" startIcon="clock">
        Pending
      </Badge>
      <Badge variant="error" startIcon="x">
        Cancelled
      </Badge>
    </div>
  ),
};

export const Clickable: Story = {
  args: {
    children: "Click me",
    variant: "blue",
    onClick: fn(),
  },
};

export const Rounded: Story = {
  args: {
    children: "5",
    variant: "error",
    rounded: true,
  },
};

export const StatusBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Booking Status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" withDot>
            Confirmed
          </Badge>
          <Badge variant="warning" withDot>
            Pending
          </Badge>
          <Badge variant="error" withDot>
            Cancelled
          </Badge>
          <Badge variant="gray" withDot>
            Rescheduled
          </Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">User Status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Pro</Badge>
          <Badge variant="blue">Team</Badge>
          <Badge variant="purple">Enterprise</Badge>
          <Badge variant="gray">Free</Badge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
