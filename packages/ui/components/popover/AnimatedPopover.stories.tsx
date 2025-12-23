import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Icon } from "../icon";
import { AnimatedPopover } from "./AnimatedPopover";

const meta = {
  component: AnimatedPopover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AnimatedPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Filter",
    children: (
      <div className="p-2">
        <div className="text-emphasis text-sm font-medium">Filter Options</div>
        <div className="text-subtle mt-2 text-sm">Select your filters here</div>
      </div>
    ),
  },
};

export const WithCount: Story = {
  args: {
    text: "Status",
    count: 3,
    children: (
      <div className="p-2 space-y-1">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Pending
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Completed
        </label>
      </div>
    ),
  },
};

export const WithPrefix: Story = {
  args: {
    text: "All Events",
    prefix: "Type:",
    children: (
      <div className="p-2 space-y-1">
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">All Events</button>
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">One-on-One</button>
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">Group</button>
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">Round Robin</button>
      </div>
    ),
  },
};

export const WithPrefixComponent: Story = {
  args: {
    text: "Calendar",
    PrefixComponent: <Icon name="calendar" className="mr-2 h-4 w-4" />,
    children: (
      <div className="p-2 space-y-1">
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">Google Calendar</button>
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">Outlook</button>
        <button className="hover:bg-subtle w-full rounded px-2 py-1 text-left text-sm">Apple Calendar</button>
      </div>
    ),
  },
};

export const DefaultOpen: Story = {
  args: {
    text: "Open by Default",
    defaultOpen: true,
    children: (
      <div className="p-2">
        <div className="text-subtle text-sm">This popover opens by default</div>
      </div>
    ),
  },
};

export const CustomTrigger: Story = {
  args: {
    text: "Custom",
    Trigger: (
      <div className="flex items-center gap-2">
        <Icon name="filter" className="h-4 w-4" />
        <span>Custom Trigger</span>
      </div>
    ),
    children: (
      <div className="p-2">
        <div className="text-subtle text-sm">Content for custom trigger</div>
      </div>
    ),
  },
};
