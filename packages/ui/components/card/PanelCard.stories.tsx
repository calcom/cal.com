import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { PanelCard } from "./PanelCard";

const meta = {
  component: PanelCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PanelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Settings",
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Panel content goes here</p>
      </div>
    ),
  },
};

export const WithSubtitle: Story = {
  args: {
    title: "Availability",
    subtitle: "Set your available hours",
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Configure when you are available for meetings</p>
      </div>
    ),
  },
};

export const WithCTA: Story = {
  args: {
    title: "Team Members",
    cta: { label: "Add Member", onClick: () => alert("Add clicked") },
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Manage your team members</p>
      </div>
    ),
  },
};

export const WithHeaderContent: Story = {
  args: {
    title: "Event Types",
    headerContent: (
      <div className="flex items-center gap-2">
        <Button size="sm" color="secondary">
          Import
        </Button>
        <Button size="sm">Create</Button>
      </div>
    ),
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Manage your event types</p>
      </div>
    ),
  },
};

export const WithTooltip: Story = {
  args: {
    title: "Webhooks",
    titleTooltip: "Webhooks allow you to receive HTTP POST requests when events occur",
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Configure webhook endpoints</p>
      </div>
    ),
  },
};

export const Collapsible: Story = {
  args: {
    title: "Advanced Settings",
    collapsible: true,
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">Advanced configuration options</p>
      </div>
    ),
  },
};

export const CollapsedByDefault: Story = {
  args: {
    title: "Optional Settings",
    collapsible: true,
    defaultCollapsed: true,
    children: (
      <div className="p-4">
        <p className="text-subtle text-sm">These settings are hidden by default</p>
      </div>
    ),
  },
};

export const WithList: Story = {
  args: {
    title: "Connected Apps",
    cta: { label: "Connect App", onClick: () => {} },
    children: (
      <div className="divide-subtle divide-y">
        {["Google Calendar", "Zoom", "Stripe"].map((app) => (
          <div key={app} className="flex items-center justify-between p-4">
            <span className="text-emphasis text-sm font-medium">{app}</span>
            <Button size="sm" color="secondary">
              Configure
            </Button>
          </div>
        ))}
      </div>
    ),
  },
};
