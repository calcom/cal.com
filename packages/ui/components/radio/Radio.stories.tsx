import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Group, RadioField } from "./Radio";

const meta = {
  component: Group,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Group>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("option1");
    return (
      <Group value={value} onValueChange={setValue}>
        <RadioField id="option1" value="option1" label="Option 1" />
        <RadioField id="option2" value="option2" label="Option 2" />
        <RadioField id="option3" value="option3" label="Option 3" />
      </Group>
    );
  },
};

export const WithPadding: Story = {
  render: () => {
    const [value, setValue] = useState("daily");
    return (
      <Group value={value} onValueChange={setValue}>
        <RadioField id="daily" value="daily" label="Daily" withPadding />
        <RadioField id="weekly" value="weekly" label="Weekly" withPadding />
        <RadioField id="monthly" value="monthly" label="Monthly" withPadding />
      </Group>
    );
  },
};

export const WithDisabled: Story = {
  render: () => {
    const [value, setValue] = useState("enabled");
    return (
      <Group value={value} onValueChange={setValue}>
        <RadioField id="enabled" value="enabled" label="Enabled option" />
        <RadioField id="disabled" value="disabled" label="Disabled option" disabled />
        <RadioField id="another" value="another" label="Another option" />
      </Group>
    );
  },
};

export const NotificationPreferences: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <div className="w-[300px]">
        <h3 className="text-emphasis mb-3 text-sm font-medium">Email Notifications</h3>
        <Group value={value} onValueChange={setValue}>
          <RadioField id="all" value="all" label="All notifications" withPadding />
          <RadioField id="important" value="important" label="Important only" withPadding />
          <RadioField id="none" value="none" label="None" withPadding />
        </Group>
      </div>
    );
  },
};

export const CalendarView: Story = {
  render: () => {
    const [value, setValue] = useState("week");
    return (
      <div className="w-[250px]">
        <h3 className="text-emphasis mb-3 text-sm font-medium">Default Calendar View</h3>
        <Group value={value} onValueChange={setValue}>
          <RadioField id="day" value="day" label="Day" />
          <RadioField id="week" value="week" label="Week" />
          <RadioField id="month" value="month" label="Month" />
        </Group>
      </div>
    );
  },
};
