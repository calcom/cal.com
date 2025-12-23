import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@calcom/ui/components/button";
import AppListCardWebWrapper from "./AppListCardWebWrapper";

const meta = {
  component: AppListCardWebWrapper,
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps",
        query: {},
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppListCardWebWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Google Calendar",
    description: "Sync your Google Calendar to check for conflicts and create events.",
    slug: "google-calendar",
  },
};

export const WithLogo: Story = {
  args: {
    title: "Zoom",
    description: "Video conferencing platform for online meetings and webinars.",
    logo: "https://app.cal.com/api/app-store/zoomvideo/icon.svg",
    slug: "zoom",
  },
};

export const WithDefaultBadge: Story = {
  args: {
    title: "Cal Video",
    description: "Built-in video conferencing solution for your meetings.",
    isDefault: true,
    slug: "cal-video",
  },
};

export const WithTemplateBadge: Story = {
  args: {
    title: "Custom Integration",
    description: "A template for building custom integrations.",
    isTemplate: true,
    slug: "custom-integration",
  },
};

export const WithActions: Story = {
  args: {
    title: "Google Meet",
    description: "Add Google Meet video conferencing to your events.",
    slug: "google-meet",
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
    slug: "outlook-calendar",
  },
};

export const Highlighted: Story = {
  args: {
    title: "New Integration",
    description: "This integration was just added and is highlighted.",
    slug: "new-integration",
    shouldHighlight: true,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps",
        query: {
          hl: "new-integration",
        },
      },
    },
  },
};

export const WithCredentialOwner: Story = {
  args: {
    title: "Stripe",
    description: "Accept payments for your bookings.",
    slug: "stripe",
    credentialOwner: {
      name: "John Doe",
      avatar: "https://avatar.vercel.sh/john-doe.svg",
    },
  },
};

export const WithChildren: Story = {
  args: {
    title: "Stripe",
    description: "Accept payments for your bookings.",
    slug: "stripe",
    children: (
      <div className="border-subtle border-t px-6 py-3">
        <p className="text-subtle text-sm">Connected account: acct_1234567890</p>
      </div>
    ),
  },
};

export const CompleteExample: Story = {
  args: {
    title: "Salesforce",
    description: "Sync your bookings with Salesforce CRM to keep your sales team informed.",
    logo: "https://app.cal.com/api/app-store/salesforce/icon.svg",
    slug: "salesforce",
    credentialOwner: {
      name: "Jane Smith",
      avatar: "https://avatar.vercel.sh/jane-smith.svg",
    },
    actions: (
      <div className="flex gap-2">
        <Button size="sm" color="secondary">
          Configure
        </Button>
      </div>
    ),
  },
};

export const MultipleApps: Story = {
  render: () => (
    <div className="divide-subtle divide-y">
      <AppListCardWebWrapper
        title="Google Calendar"
        description="Sync your Google Calendar."
        slug="google-calendar"
        isDefault
        actions={
          <Button size="sm" color="secondary">
            Configure
          </Button>
        }
      />
      <AppListCardWebWrapper
        title="Zoom"
        description="Video conferencing for meetings."
        slug="zoom"
        actions={
          <Button size="sm" color="secondary">
            Configure
          </Button>
        }
      />
      <AppListCardWebWrapper
        title="Stripe"
        description="Accept payments."
        slug="stripe"
        actions={
          <Button size="sm" color="secondary">
            Configure
          </Button>
        }
      />
    </div>
  ),
};
