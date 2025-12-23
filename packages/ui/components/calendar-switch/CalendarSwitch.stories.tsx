import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Switch } from "../form/switch";
import { CalendarSwitchComponent } from "./CalendarSwitch";

const meta = {
  title: "CalendarSwitch",
  component: CalendarSwitchComponent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CalendarSwitchComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    externalId: "calendar-1",
    name: "Personal Calendar",
    isLoading: false,
    children: <Switch />,
  },
};

export const Loading: Story = {
  args: {
    externalId: "calendar-2",
    name: "Work Calendar",
    isLoading: true,
    children: <Switch />,
  },
};

export const WithDestination: Story = {
  args: {
    externalId: "calendar-3",
    name: "Google Calendar",
    isLoading: false,
    destination: true,
    children: <Switch defaultChecked />,
  },
};

export const WithCustomTranslation: Story = {
  args: {
    externalId: "calendar-4",
    name: "Outlook Calendar",
    isLoading: false,
    destination: true,
    translations: {
      spanText: "Syncing events to",
    },
    children: <Switch defaultChecked />,
  },
};

export const MultipleCalendars: Story = {
  render: () => (
    <div className="space-y-2">
      <CalendarSwitchComponent externalId="cal-1" name="Personal Calendar" isLoading={false}>
        <Switch defaultChecked />
      </CalendarSwitchComponent>
      <CalendarSwitchComponent externalId="cal-2" name="Work Calendar" isLoading={false} destination>
        <Switch defaultChecked />
      </CalendarSwitchComponent>
      <CalendarSwitchComponent externalId="cal-3" name="Team Calendar" isLoading={true}>
        <Switch />
      </CalendarSwitchComponent>
    </div>
  ),
};
