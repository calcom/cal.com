import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DateTargetSelector, type DateTarget } from "./DateTargetSelector";

// Mock the useLocale hook
jest.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        booking_time_option: "Booking Time",
        booking_time_option_description: "Filter by when the booking is scheduled to occur",
        created_at_option: "Created At",
        created_at_option_description: "Filter by when the booking was created",
      };
      return translations[key] || key;
    },
  }),
}));

const meta = {
  component: DateTargetSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "select",
      options: ["startTime", "createdAt"],
      description: "The currently selected date target",
    },
    onChange: {
      action: "changed",
      description: "Callback function called when the selection changes",
    },
  },
} satisfies Meta<typeof DateTargetSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("startTime");
    return <DateTargetSelector value={value} onChange={setValue} />;
  },
};

export const BookingTimeSelected: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("startTime");
    return <DateTargetSelector value={value} onChange={setValue} />;
  },
};

export const CreatedAtSelected: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("createdAt");
    return <DateTargetSelector value={value} onChange={setValue} />;
  },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("startTime");
    return (
      <div className="flex flex-col gap-4">
        <DateTargetSelector value={value} onChange={setValue} />
        <div className="text-sm text-muted-foreground">
          Current selection: <span className="font-medium">{value}</span>
        </div>
      </div>
    );
  },
};

export const WithContextDisplay: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("startTime");
    const displayText = value === "startTime" ? "Booking Time" : "Created At";
    return (
      <div className="flex flex-col gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by:</span>
          <DateTargetSelector value={value} onChange={setValue} />
        </div>
        <div className="text-sm text-muted-foreground p-4 border border-gray-200 rounded-md">
          Filtering insights by: <span className="font-semibold">{displayText}</span>
        </div>
      </div>
    );
  },
};

export const MultipleInstances: Story = {
  render: () => {
    const [value1, setValue1] = useState<DateTarget>("startTime");
    const [value2, setValue2] = useState<DateTarget>("createdAt");
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm">Filter 1:</span>
          <DateTargetSelector value={value1} onChange={setValue1} />
          <span className="text-xs text-muted-foreground">({value1})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Filter 2:</span>
          <DateTargetSelector value={value2} onChange={setValue2} />
          <span className="text-xs text-muted-foreground">({value2})</span>
        </div>
      </div>
    );
  },
};

export const InFilterBar: Story = {
  render: () => {
    const [value, setValue] = useState<DateTarget>("startTime");
    return (
      <div className="flex items-center gap-2 p-4 border border-gray-200 rounded-md bg-gray-50">
        <span className="text-sm font-medium">Insights Filters:</span>
        <div className="flex-1" />
        <DateTargetSelector value={value} onChange={setValue} />
      </div>
    );
  },
};
