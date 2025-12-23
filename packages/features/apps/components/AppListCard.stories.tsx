import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@calcom/ui/components/button";

import AppListCard from "./AppListCard";

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
    logo: "/api/app-store/zoomvideo/icon.svg",
  },
};

export const WithDefaultBadge: Story = {
  args: {
    title: "Cal Video",
    description: "Built-in video conferencing solution for your meetings.",
    logo: "/api/app-store/daily-video/icon.svg",
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
    logo: "/api/app-store/around/icon.svg",
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
    logo: "/api/app-store/office365-calendar/icon.svg",
    invalidCredential: true,
  },
};

export const WithCredentialOwner: Story = {
  args: {
    title: "Google Calendar",
    description: "Sync your Google Calendar to check for conflicts and create events.",
    logo: "/api/app-store/google-calendar/icon.svg",
    credentialOwner: {
      name: "John Doe",
      avatar: null,
      email: "john@example.com",
    },
  },
};

export const WithHighlight: Story = {
  args: {
    title: "New Integration",
    description: "This integration was just added and is highlighted.",
    logo: "/api/app-store/stripepayment/icon.svg",
    slug: "new-integration",
    shouldHighlight: true,
  },
};

export const WithChildren: Story = {
  args: {
    title: "Stripe",
    description: "Accept payments for your bookings.",
    logo: "/api/app-store/stripepayment/icon.svg",
    children: (
      <div className="border-subtle border-t px-6 py-3">
        <p className="text-subtle text-sm">Connected account: acct_1234567890</p>
      </div>
    ),
  },
};

export const ComplexExample: Story = {
  args: {
    title: "Google Calendar",
    description: "Sync your Google Calendar to check for conflicts and create events.",
    logo: "/api/app-store/google-calendar/icon.svg",
    isDefault: true,
    credentialOwner: {
      name: "Jane Smith",
      avatar: null,
      email: "jane@example.com",
    },
    actions: (
      <div className="flex gap-2">
        <Button size="sm" color="secondary">
          Configure
        </Button>
        <Button size="sm" color="destructive">
          Disconnect
        </Button>
      </div>
    ),
    children: (
      <div className="border-subtle border-t px-6 py-3">
        <div className="flex flex-col gap-2">
          <p className="text-subtle text-xs">Last synced: 2 minutes ago</p>
          <p className="text-subtle text-xs">Calendars connected: 3</p>
        </div>
      </div>
    ),
  },
};

export const MultipleApps: Story = {
  render: () => (
    <div className="divide-subtle w-[600px] divide-y">
      <AppListCard
        title="Google Calendar"
        description="Sync your Google Calendar to check for conflicts."
        logo="/api/app-store/google-calendar/icon.svg"
        isDefault
        actions={
          <Button size="sm" color="secondary">
            Configure
          </Button>
        }
      />
      <AppListCard
        title="Zoom"
        description="Video conferencing for online meetings."
        logo="/api/app-store/zoomvideo/icon.svg"
        actions={
          <Button size="sm" color="secondary">
            Configure
          </Button>
        }
      />
      <AppListCard
        title="Stripe"
        description="Accept payments for your bookings."
        logo="/api/app-store/stripepayment/icon.svg"
        invalidCredential
        actions={
          <Button size="sm" color="destructive">
            Reconnect
          </Button>
        }
      />
    </div>
  ),
};
