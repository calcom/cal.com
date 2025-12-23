import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { BooleanToggleGroup } from "./BooleanToggleGroup";

const meta = {
  component: BooleanToggleGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BooleanToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(true);
    return <BooleanToggleGroup value={value} onValueChange={(v) => setValue(v ?? true)} />;
  },
};

export const DefaultNo: Story = {
  render: () => {
    const [value, setValue] = useState(false);
    return <BooleanToggleGroup value={value} onValueChange={(v) => setValue(v ?? false)} />;
  },
};

export const SmallVariant: Story = {
  render: () => {
    const [value, setValue] = useState(true);
    return <BooleanToggleGroup value={value} onValueChange={(v) => setValue(v ?? true)} variant="small" />;
  },
};

export const Disabled: Story = {
  render: () => {
    return <BooleanToggleGroup value={true} disabled />;
  },
};

export const DisabledNo: Story = {
  render: () => {
    return <BooleanToggleGroup value={false} disabled />;
  },
};

export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState(true);
    return (
      <div className="flex items-center gap-4">
        <span className="text-emphasis text-sm font-medium">Enable notifications</span>
        <BooleanToggleGroup value={value} onValueChange={(v) => setValue(v ?? true)} />
      </div>
    );
  },
};

export const MultipleToggles: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      reminders: false,
      sync: true,
    });
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-emphasis text-sm">Email notifications</span>
          <BooleanToggleGroup
            value={settings.notifications}
            onValueChange={(v) => setSettings((s) => ({ ...s, notifications: v ?? true }))}
            variant="small"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emphasis text-sm">Send reminders</span>
          <BooleanToggleGroup
            value={settings.reminders}
            onValueChange={(v) => setSettings((s) => ({ ...s, reminders: v ?? false }))}
            variant="small"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emphasis text-sm">Calendar sync</span>
          <BooleanToggleGroup
            value={settings.sync}
            onValueChange={(v) => setSettings((s) => ({ ...s, sync: v ?? true }))}
            variant="small"
          />
        </div>
      </div>
    );
  },
};
