import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Provider as TooltipProvider } from "@radix-ui/react-tooltip";
import { fn } from "storybook/test";

import { Icon } from "../../icon";
import { ToggleGroup } from "./ToggleGroup";

const meta = {
  component: ToggleGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
    ],
    defaultValue: "week",
  },
};

export const WithDefaultValue: Story = {
  args: {
    options: [
      { value: "grid", label: "Grid" },
      { value: "list", label: "List" },
      { value: "calendar", label: "Calendar" },
    ],
    defaultValue: "grid",
  },
};

export const WithIcons: Story = {
  args: {
    options: [
      { value: "grid", label: "Grid", iconLeft: <Icon name="grid-3x3" className="h-4 w-4" /> },
      { value: "list", label: "List", iconLeft: <Icon name="list-filter" className="h-4 w-4" /> },
      { value: "columns", label: "Columns", iconLeft: <Icon name="columns-3" className="h-4 w-4" /> },
    ],
    defaultValue: "grid",
  },
};

export const IconOnly: Story = {
  args: {
    options: [
      { value: "day", label: <Icon name="sun" className="h-4 w-4" /> },
      { value: "week", label: <Icon name="calendar" className="h-4 w-4" /> },
      { value: "month", label: <Icon name="calendar-days" className="h-4 w-4" /> },
    ],
    defaultValue: "day",
  },
};

export const WithTooltips: Story = {
  args: {
    options: [
      { value: "day", label: "Day", tooltip: "View by day" },
      { value: "week", label: "Week", tooltip: "View by week" },
      { value: "month", label: "Month", tooltip: "View by month" },
    ],
    defaultValue: "week",
  },
};

export const WithDisabledOption: Story = {
  args: {
    options: [
      { value: "free", label: "Free" },
      { value: "pro", label: "Pro" },
      { value: "enterprise", label: "Enterprise", disabled: true, tooltip: "Coming soon" },
    ],
    defaultValue: "free",
  },
};

export const FullWidth: Story = {
  args: {
    options: [
      { value: "all", label: "All" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    defaultValue: "all",
    isFullWidth: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
};

export const Vertical: Story = {
  args: {
    options: [
      { value: "profile", label: "Profile" },
      { value: "settings", label: "Settings" },
      { value: "billing", label: "Billing" },
      { value: "notifications", label: "Notifications" },
    ],
    defaultValue: "profile",
    orientation: "vertical",
  },
};

export const TwoOptions: Story = {
  args: {
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
    defaultValue: "on",
  },
};

export const ViewModeToggle: Story = {
  args: {
    options: [
      { value: "preview", label: "Preview" },
      { value: "code", label: "Code" },
      { value: "split", label: "Split" },
    ],
    defaultValue: "preview",
  },
};

export const BookingViewToggle: Story = {
  args: {
    options: [
      { value: "upcoming", label: "Upcoming" },
      { value: "past", label: "Past" },
      { value: "cancelled", label: "Cancelled" },
    ],
    defaultValue: "upcoming",
  },
};

export const TimeFormatToggle: Story = {
  args: {
    options: [
      { value: "12h", label: "12h" },
      { value: "24h", label: "24h" },
    ],
    defaultValue: "12h",
  },
};

export const AvailabilityToggle: Story = {
  args: {
    options: [
      { value: "available", label: "Available", iconLeft: <Icon name="check" className="h-4 w-4" /> },
      { value: "busy", label: "Busy", iconLeft: <Icon name="x" className="h-4 w-4" /> },
    ],
    defaultValue: "available",
  },
};
