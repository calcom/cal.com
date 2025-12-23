import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RangeSlider } from "./RangeSlider";

const meta = {
  component: RangeSlider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([25, 75]);
    return (
      <div className="space-y-4">
        <RangeSlider value={value} onValueChange={setValue} max={100} step={1} />
        <p className="text-subtle text-sm">
          Range: {value[0]} - {value[1]}
        </p>
      </div>
    );
  },
};

export const TimeRange: Story = {
  render: () => {
    const [value, setValue] = useState([9, 17]);
    const formatTime = (hour: number) => {
      const suffix = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${suffix}`;
    };
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Available Hours</label>
        <RangeSlider value={value} onValueChange={setValue} min={0} max={24} step={1} />
        <p className="text-subtle text-sm">
          {formatTime(value[0])} - {formatTime(value[1])}
        </p>
      </div>
    );
  },
};

export const PriceRange: Story = {
  render: () => {
    const [value, setValue] = useState([50, 200]);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Price Range</label>
        <RangeSlider value={value} onValueChange={setValue} min={0} max={500} step={10} />
        <div className="flex justify-between text-sm">
          <span className="text-subtle">${value[0]}</span>
          <span className="text-subtle">${value[1]}</span>
        </div>
      </div>
    );
  },
};

export const DurationRange: Story = {
  render: () => {
    const [value, setValue] = useState([15, 60]);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Meeting Duration</label>
        <RangeSlider value={value} onValueChange={setValue} min={5} max={120} step={5} />
        <p className="text-subtle text-sm">
          {value[0]} min - {value[1]} min
        </p>
      </div>
    );
  },
};

export const BufferTime: Story = {
  render: () => {
    const [value, setValue] = useState([0, 30]);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Buffer Time Range</label>
        <p className="text-subtle text-xs">Set minimum and maximum buffer between meetings</p>
        <RangeSlider value={value} onValueChange={setValue} min={0} max={60} step={5} />
        <div className="flex justify-between text-sm">
          <span className="text-subtle">Before: {value[0]} min</span>
          <span className="text-subtle">After: {value[1]} min</span>
        </div>
      </div>
    );
  },
};
