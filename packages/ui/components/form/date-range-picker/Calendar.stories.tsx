import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "./Calendar";

const meta = {
  component: Calendar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>();
    return <Calendar mode="single" selected={selected} onSelect={setSelected} />;
  },
};

export const RangeSelect: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange>();
    return <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />;
  },
};

export const WithMinDate: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>();
    return <Calendar mode="single" selected={selected} onSelect={setSelected} fromDate={new Date()} />;
  },
};

export const WithMaxDate: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return (
      <Calendar mode="single" selected={selected} onSelect={setSelected} fromDate={new Date()} toDate={maxDate} />
    );
  },
};

export const TwoMonths: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange>();
    return <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />;
  },
};

export const HideOutsideDays: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>();
    return <Calendar mode="single" selected={selected} onSelect={setSelected} showOutsideDays={false} />;
  },
};
