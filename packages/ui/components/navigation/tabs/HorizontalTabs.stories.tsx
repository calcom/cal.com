import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../button";
import HorizontalTabs from "./HorizontalTabs";

const meta = {
  component: HorizontalTabs,
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HorizontalTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      { name: "upcoming", href: "#upcoming" },
      { name: "recurring", href: "#recurring" },
      { name: "past", href: "#past" },
      { name: "cancelled", href: "#cancelled" },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    tabs: [
      { name: "profile", href: "#profile", icon: "user" },
      { name: "calendars", href: "#calendars", icon: "calendar" },
      { name: "conferencing", href: "#conferencing", icon: "video" },
      { name: "appearance", href: "#appearance", icon: "palette" },
    ],
  },
};

export const WithActiveTab: Story = {
  args: {
    tabs: [
      { name: "upcoming", href: "#upcoming", isActive: true },
      { name: "recurring", href: "#recurring" },
      { name: "past", href: "#past" },
      { name: "cancelled", href: "#cancelled" },
    ],
  },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      { name: "general", href: "#general" },
      { name: "security", href: "#security" },
      { name: "billing", href: "#billing", disabled: true },
      { name: "integrations", href: "#integrations" },
    ],
  },
};

export const EventTypeTabs: Story = {
  args: {
    tabs: [
      { name: "event_setup", href: "#setup", icon: "link" },
      { name: "availability", href: "#availability", icon: "clock" },
      { name: "limits", href: "#limits", icon: "sliders-vertical" },
      { name: "advanced", href: "#advanced", icon: "settings" },
    ],
  },
};

export const SettingsTabs: Story = {
  args: {
    tabs: [
      { name: "profile", href: "#profile", icon: "user" },
      { name: "teams", href: "#teams", icon: "users" },
      { name: "security", href: "#security", icon: "lock" },
      { name: "billing", href: "#billing", icon: "credit-card" },
      { name: "developer", href: "#developer", icon: "terminal" },
    ],
  },
};

export const WithActions: Story = {
  args: {
    tabs: [
      { name: "all", href: "#all", isActive: true },
      { name: "active", href: "#active" },
      { name: "draft", href: "#draft" },
      { name: "archived", href: "#archived" },
    ],
    actions: (
      <div className="ml-auto">
        <Button size="sm">New Event Type</Button>
      </div>
    ),
  },
};

export const BookingsTabs: Story = {
  args: {
    tabs: [
      { name: "upcoming", href: "#upcoming", isActive: true },
      { name: "unconfirmed", href: "#unconfirmed" },
      { name: "recurring", href: "#recurring" },
      { name: "past", href: "#past" },
      { name: "cancelled", href: "#cancelled" },
    ],
  },
};

export const TwoTabs: Story = {
  args: {
    tabs: [
      { name: "personal", href: "#personal", isActive: true },
      { name: "team", href: "#team" },
    ],
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: [
      { name: "overview", href: "#overview" },
      { name: "analytics", href: "#analytics" },
      { name: "reports", href: "#reports" },
      { name: "notifications", href: "#notifications" },
      { name: "integrations", href: "#integrations" },
      { name: "webhooks", href: "#webhooks" },
      { name: "api_keys", href: "#api-keys" },
      { name: "audit_log", href: "#audit-log" },
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
};
