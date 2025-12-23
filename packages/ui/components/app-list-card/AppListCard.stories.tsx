import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { AppListCard } from "./AppListCard";

const meta = {
  component: AppListCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Google Calendar",
    description: "Sync your Google Calendar to check for conflicts and create events.",
  },
};

export const WithLogo: Story = {
  args: {
    title: "Zoom",
    description: "Video conferencing platform for online meetings and webinars.",
    logo: "https://app.cal.com/api/app-store/zoomvideo/icon.svg",
  },
};

export const WithDefaultBadge: Story = {
  args: {
    title: "Cal Video",
    description: "Built-in video conferencing solution for your meetings.",
    isDefault: true,
  },
};

export const WithTemplateBadge: Story = {
  args: {
    title: "Custom Integration",
    description: "A template for building custom integrations.",
    isTemplate: true,
  },
};

export const WithActions: Story = {
  args: {
    title: "Google Meet",
    description: "Add Google Meet video conferencing to your events.",
    actions: (
      <div className="flex gap-2">
        <Button size="sm" color="secondary">
          Edit
        </Button>
        <Button size="sm" color="destructive">
          Remove
        </Button>
      </div>
    ),
  },
};

export const InvalidCredential: Story = {
  args: {
    title: "Outlook Calendar",
    description: "Sync with Microsoft Outlook Calendar.",
    invalidCredential: true,
  },
};

export const Highlighted: Story = {
  args: {
    title: "New Integration",
    description: "This integration was just added and is highlighted.",
    highlight: true,
  },
};

export const WithChildren: Story = {
  args: {
    title: "Stripe",
    description: "Accept payments for your bookings.",
    children: (
      <div className="border-subtle border-t px-6 py-3">
        <p className="text-subtle text-sm">Connected account: acct_1234567890</p>
      </div>
    ),
  },
};

export const MultipleApps: Story = {
  render: () => (
    <div className="divide-subtle divide-y">
      <AppListCard
        title="Google Calendar"
        description="Sync your Google Calendar."
        isDefault
        actions={<Button size="sm" color="secondary">Configure</Button>}
      />
      <AppListCard
        title="Zoom"
        description="Video conferencing for meetings."
        actions={<Button size="sm" color="secondary">Configure</Button>}
      />
      <AppListCard
        title="Stripe"
        description="Accept payments."
        actions={<Button size="sm" color="secondary">Configure</Button>}
      />
    </div>
  ),
};
