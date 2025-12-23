import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import DatePicker from "./DatePicker";

const meta = {
  component: DatePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onDatesChange: fn(),
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(),
  },
};

export const WithLabel: Story = {
  args: {
    date: new Date(),
    label: "Select start date",
  },
};

export const FutureDate: Story = {
  args: {
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  },
};

export const WithMinDate: Story = {
  args: {
    date: new Date(),
    minDate: new Date(),
  },
};

export const Disabled: Story = {
  args: {
    date: new Date(),
    disabled: true,
  },
};

export const Controlled: Story = {
  render: function ControlledDatePicker() {
    const [date, setDate] = useState(new Date());

    return (
      <div className="space-y-4">
        <p className="text-sm">
          Selected: {date.toLocaleDateString()}
        </p>
        <DatePicker date={date} onDatesChange={setDate} />
      </div>
    );
  },
};

export const InForm: Story = {
  render: function FormExample() {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return (
      <div className="w-[300px] space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Start Date</label>
          <DatePicker date={startDate} onDatesChange={setStartDate} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">End Date</label>
          <DatePicker date={endDate} onDatesChange={setEndDate} minDate={startDate} />
        </div>
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};
