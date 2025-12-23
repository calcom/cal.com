import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { DatePickerWithRange } from "./DateRangePicker";

const meta = {
  component: DatePickerWithRange,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DatePickerWithRange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({});
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} />;
  },
};

export const WithSelectedRange: Story = {
  render: () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({
      startDate: today,
      endDate: nextWeek,
    });
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} />;
  },
};

export const WithMinDate: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({});
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} minDate={new Date()} />;
  },
};

export const WithMaxDate: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({});
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} maxDate={maxDate} />;
  },
};

export const AllowPastDates: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({});
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} allowPastDates minDate={null} />;
  },
};

export const WithoutPopover: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({});
    return (
      <div className="border-subtle rounded-lg border p-4">
        <DatePickerWithRange dates={dates} onDatesChange={setDates} withoutPopover />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [dates, setDates] = useState<{ startDate?: Date; endDate?: Date }>({
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return <DatePickerWithRange dates={dates} onDatesChange={setDates} disabled />;
  },
};
