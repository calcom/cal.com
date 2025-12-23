import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Switch } from "./Switch";

const meta = {
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      description: "Whether the switch is checked",
      control: "boolean",
    },
    disabled: {
      description: "Whether the switch is disabled",
      control: "boolean",
    },
    label: {
      description: "Label text for the switch",
      control: "text",
    },
    size: {
      description: "Size of the switch",
      control: { type: "select" },
      options: ["base", "sm"],
    },
    labelOnLeading: {
      description: "Place label before the switch",
      control: "boolean",
    },
  },
  args: {
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Enable notifications",
  },
};

export const Checked: Story = {
  args: {
    label: "Notifications enabled",
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Premium feature",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Always enabled",
    checked: true,
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    label: "Compact mode",
    size: "sm",
  },
};

export const WithTooltip: Story = {
  args: {
    label: "Beta feature",
    tooltip: "This feature is still in beta and may change",
  },
};

export const LabelOnLeading: Story = {
  args: {
    label: "Dark mode",
    labelOnLeading: true,
    checked: true,
  },
};

export const WithPadding: Story = {
  args: {
    label: "Hover effect",
    padding: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Switch label="Base size (default)" size="base" />
      <Switch label="Small size" size="sm" />
    </div>
  ),
};

export const SettingsExample: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div className="border-subtle rounded-lg border p-4">
        <h3 className="text-emphasis mb-4 font-semibold">Notification Settings</h3>
        <div className="space-y-4">
          <Switch label="Email notifications" defaultChecked />
          <Switch label="Push notifications" defaultChecked />
          <Switch label="SMS notifications" />
          <Switch label="Marketing emails" />
        </div>
      </div>
      <div className="border-subtle rounded-lg border p-4">
        <h3 className="text-emphasis mb-4 font-semibold">Privacy</h3>
        <div className="space-y-4">
          <Switch label="Show my profile publicly" defaultChecked />
          <Switch label="Allow analytics" defaultChecked />
          <Switch label="Share usage data" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
