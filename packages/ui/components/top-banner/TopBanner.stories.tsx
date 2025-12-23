import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { TopBanner } from "./TopBanner";

const meta = {
  component: TopBanner,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      description: "Visual style variant",
      control: { type: "select" },
      options: ["default", "warning", "error"],
    },
    text: {
      description: "Banner text content",
      control: "text",
    },
  },
} satisfies Meta<typeof TopBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Welcome to Cal.com! Complete your profile to get started.",
    variant: "default",
  },
};

export const Warning: Story = {
  args: {
    text: "Your trial ends in 3 days. Upgrade now to keep your features.",
    variant: "warning",
  },
};

export const Error: Story = {
  args: {
    text: "Your calendar connection has been lost. Please reconnect.",
    variant: "error",
  },
};

export const WithIcon: Story = {
  args: {
    text: "New feature available! Try our AI scheduling assistant.",
    variant: "default",
    icon: "sparkles",
  },
};

export const WithActions: Story = {
  args: {
    text: "Your subscription is about to expire.",
    variant: "warning",
    actions: (
      <Button size="sm" color="primary">
        Renew Now
      </Button>
    ),
  },
};

export const ErrorWithAction: Story = {
  args: {
    text: "Payment failed. Please update your billing information.",
    variant: "error",
    actions: (
      <Button size="sm" color="primary">
        Update Payment
      </Button>
    ),
  },
};

export const Announcement: Story = {
  args: {
    text: "Cal.com 2024 is here! Check out all the new features.",
    variant: "default",
    icon: "megaphone",
    actions: (
      <Button size="sm" color="secondary">
        Learn More
      </Button>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-2">
      <TopBanner text="Default banner with important information" variant="default" />
      <TopBanner text="Warning: Your trial expires in 7 days" variant="warning" />
      <TopBanner text="Error: Calendar sync failed" variant="error" />
    </div>
  ),
};
