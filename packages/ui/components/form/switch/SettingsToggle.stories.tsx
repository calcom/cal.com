import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Badge } from "../../badge";
import { Input } from "../inputs/TextField";
import { SettingsToggle } from "./SettingsToggle";

const meta = {
  component: SettingsToggle,
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
} satisfies Meta<typeof SettingsToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <SettingsToggle
        title="Enable notifications"
        description="Receive email notifications for new bookings"
        checked={checked}
        onCheckedChange={setChecked}
      />
    );
  },
};

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <SettingsToggle
        title="Calendar sync"
        description="Automatically sync with your connected calendars"
        checked={checked}
        onCheckedChange={setChecked}
      />
    );
  },
};

export const ToggleAtEnd: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <SettingsToggle
        title="Require confirmation"
        description="Bookings will need to be confirmed before they are added to your calendar"
        checked={checked}
        onCheckedChange={setChecked}
        toggleSwitchAtTheEnd
      />
    );
  },
};

export const WithChildren: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <SettingsToggle
        title="Custom redirect"
        description="Redirect users to a custom URL after booking"
        checked={checked}
        onCheckedChange={setChecked}
        toggleSwitchAtTheEnd>
        <div className="border-subtle border-t p-4">
          <label className="text-emphasis mb-2 block text-sm font-medium">Redirect URL</label>
          <Input placeholder="https://example.com/thank-you" />
        </div>
      </SettingsToggle>
    );
  },
};

export const WithBadge: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <SettingsToggle
        title="AI Scheduling"
        description="Let AI optimize your meeting times"
        checked={checked}
        onCheckedChange={setChecked}
        Badge={<Badge variant="blue">Beta</Badge>}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <SettingsToggle
      title="Advanced analytics"
      description="Access detailed booking analytics and insights"
      checked={false}
      disabled
      onCheckedChange={() => {}}
      Badge={<Badge variant="gray">Pro</Badge>}
    />
  ),
};

export const MultipleSettings: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      confirmations: false,
      reminders: true,
      sync: true,
    });
    return (
      <div className="space-y-6">
        <SettingsToggle
          title="Email notifications"
          description="Get notified when someone books a meeting"
          checked={settings.notifications}
          onCheckedChange={(checked) => setSettings((s) => ({ ...s, notifications: checked }))}
        />
        <SettingsToggle
          title="Require confirmation"
          description="Manually approve bookings before they're confirmed"
          checked={settings.confirmations}
          onCheckedChange={(checked) => setSettings((s) => ({ ...s, confirmations: checked }))}
        />
        <SettingsToggle
          title="Send reminders"
          description="Automatically send reminder emails before meetings"
          checked={settings.reminders}
          onCheckedChange={(checked) => setSettings((s) => ({ ...s, reminders: checked }))}
        />
        <SettingsToggle
          title="Calendar sync"
          description="Keep your external calendars in sync"
          checked={settings.sync}
          onCheckedChange={(checked) => setSettings((s) => ({ ...s, sync: checked }))}
        />
      </div>
    );
  },
};
