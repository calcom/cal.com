import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import { TroubleshooterListItemContainer, TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";

const meta = {
  component: TroubleshooterListItemContainer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      description: "The main title text",
      control: { type: "text" },
    },
    subtitle: {
      description: "Optional subtitle text",
      control: { type: "text" },
    },
    prefixSlot: {
      description: "Content to display before the title",
      control: false,
    },
    suffixSlot: {
      description: "Content to display after the title",
      control: false,
    },
    className: {
      description: "Additional CSS classes",
      control: { type: "text" },
    },
    children: {
      description: "Content to display in the container body",
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TroubleshooterListItemContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Default Item",
    children: <p className="text-sm">This is the content area of the troubleshooter item.</p>,
  },
};

export const WithSubtitle: Story = {
  args: {
    title: "Item with Subtitle",
    subtitle: "Additional information here",
    children: (
      <div className="space-y-2">
        <p className="text-sm">Main content with subtitle example.</p>
        <p className="text-sm text-subtle">This shows how subtitles work in the header.</p>
      </div>
    ),
  },
};

export const WithPrefixIcon: Story = {
  args: {
    title: "Calendar Integration",
    subtitle: "Connected",
    prefixSlot: <div className="h-4 w-4 self-center rounded-[4px] bg-blue-500" />,
    children: (
      <div className="space-y-2">
        <p className="text-sm">Calendar integration settings and options.</p>
        <p className="text-sm text-subtle">Sync your events across all calendars.</p>
      </div>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    title: "Google Calendar",
    subtitle: "google@calendar.com",
    prefixSlot: <div className="h-4 w-4 self-center rounded-[4px] bg-green-500" />,
    suffixSlot: (
      <Badge variant="green" withDot size="sm">
        Connected
      </Badge>
    ),
    children: (
      <div className="space-y-2">
        <p className="text-sm">Your Google Calendar is successfully connected.</p>
        <p className="text-sm text-subtle">Last synced: 2 minutes ago</p>
      </div>
    ),
  },
};

export const WithActionButton: Story = {
  args: {
    title: "Availability Schedule",
    subtitle: "Working Hours",
    prefixSlot: <div className="h-4 w-4 rounded-[4px] bg-black" />,
    suffixSlot: (
      <Button size="sm" color="secondary">
        Edit
      </Button>
    ),
    children: (
      <div className="space-y-2">
        <p className="text-sm">Monday - Friday: 9:00 AM - 5:00 PM</p>
        <p className="text-sm text-subtle">Configure your availability settings</p>
      </div>
    ),
  },
};

export const WithEditBadge: Story = {
  args: {
    title: "Event Schedule",
    prefixSlot: <div className="h-4 w-4 rounded-[4px] bg-black" />,
    suffixSlot: (
      <Badge color="orange" size="sm" className="hover:cursor-pointer">
        Edit
      </Badge>
    ),
    className: "group",
    children: (
      <div className="space-y-2">
        <p className="text-sm">Customize your event scheduling options.</p>
        <p className="text-sm text-subtle">Click edit to modify settings</p>
      </div>
    ),
  },
};

export const DisconnectedState: Story = {
  args: {
    title: "Outlook Calendar",
    subtitle: "outlook@email.com",
    prefixSlot: <div className="h-4 w-4 self-center rounded-[4px] bg-red-500" />,
    suffixSlot: (
      <Badge variant="red" withDot size="sm">
        Disconnected
      </Badge>
    ),
    children: (
      <div className="space-y-2">
        <p className="text-sm text-error">Your Outlook Calendar connection has been lost.</p>
        <Button size="sm" color="primary">
          Reconnect
        </Button>
      </div>
    ),
  },
};

export const WithIconPrefix: Story = {
  args: {
    title: "Notifications",
    subtitle: "Email & SMS alerts",
    prefixSlot: <Icon name="bell" className="h-4 w-4 self-center text-brand-default" />,
    suffixSlot: (
      <Badge variant="gray" size="sm">
        Enabled
      </Badge>
    ),
    children: (
      <div className="space-y-2">
        <p className="text-sm">Manage your notification preferences.</p>
        <div className="flex gap-2">
          <Button size="sm" color="secondary">
            Configure
          </Button>
        </div>
      </div>
    ),
  },
};

export const MultipleItems: Story = {
  render: () => (
    <div className="space-y-4">
      <TroubleshooterListItemContainer
        title="Google Calendar"
        subtitle="google@calendar.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-blue-500" />}
        suffixSlot={
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        }>
        <p className="text-sm">Calendar synced successfully.</p>
      </TroubleshooterListItemContainer>

      <TroubleshooterListItemContainer
        title="Outlook Calendar"
        subtitle="outlook@email.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-blue-600" />}
        suffixSlot={
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        }>
        <p className="text-sm">Calendar synced successfully.</p>
      </TroubleshooterListItemContainer>

      <TroubleshooterListItemContainer
        title="Apple Calendar"
        subtitle="apple@icloud.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-gray-500" />}
        suffixSlot={
          <Badge variant="red" withDot size="sm">
            Disconnected
          </Badge>
        }>
        <p className="text-sm text-error">Connection failed. Please reconnect.</p>
      </TroubleshooterListItemContainer>
    </div>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <div className="w-[600px] space-y-0">
      <TroubleshooterListItemHeader
        title="First Item"
        subtitle="google@calendar.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-blue-500" />}
        suffixSlot={
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        }
      />
      <TroubleshooterListItemHeader
        title="Second Item"
        subtitle="outlook@email.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-blue-600" />}
        suffixSlot={
          <Badge variant="green" withDot size="sm">
            Connected
          </Badge>
        }
      />
      <TroubleshooterListItemHeader
        title="Third Item"
        subtitle="apple@icloud.com"
        prefixSlot={<div className="h-4 w-4 self-center rounded-[4px] bg-gray-500" />}
        suffixSlot={
          <Badge variant="red" withDot size="sm">
            Disconnected
          </Badge>
        }
        className="border-b"
      />
    </div>
  ),
};

export const RichContent: Story = {
  args: {
    title: "Advanced Configuration",
    subtitle: "System settings",
    prefixSlot: <Icon name="settings" className="h-4 w-4 self-center text-brand-default" />,
    suffixSlot: (
      <Badge variant="blue" size="sm">
        Active
      </Badge>
    ),
    children: (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Current Settings</p>
          <ul className="mt-2 space-y-1 text-sm text-subtle">
            <li>- Timezone: UTC-8</li>
            <li>- Buffer time: 15 minutes</li>
            <li>- Max bookings per day: 8</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Button size="sm" color="primary">
            Update Settings
          </Button>
          <Button size="sm" color="secondary">
            Reset to Default
          </Button>
        </div>
      </div>
    ),
  },
};
