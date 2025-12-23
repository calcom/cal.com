import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RangeSliderPopover } from "./RangeSliderPopover";

const meta = {
  component: RangeSliderPopover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RangeSliderPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([10, 90]);
    return (
      <RangeSliderPopover
        triggerText="Range"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
      />
    );
  },
};

export const PriceRange: Story = {
  render: () => {
    const [value, setValue] = useState([50, 200]);
    return (
      <RangeSliderPopover
        triggerText="Price"
        value={value}
        onChange={setValue}
        min={0}
        max={500}
        step={10}
        inputLeading="$"
        badgeSuffix="USD"
      />
    );
  },
};

export const DurationRange: Story = {
  render: () => {
    const [value, setValue] = useState([15, 60]);
    return (
      <RangeSliderPopover
        triggerText="Duration"
        value={value}
        onChange={setValue}
        min={5}
        max={120}
        step={5}
        inputSuffix="min"
        badgeSuffix="min"
      />
    );
  },
};

export const WithSuccessBadge: Story = {
  render: () => {
    const [value, setValue] = useState([25, 75]);
    return (
      <RangeSliderPopover
        triggerText="Availability"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        badgeVariant="success"
        badgeSuffix="%"
      />
    );
  },
};

export const CustomButtonLabels: Story = {
  render: () => {
    const [value, setValue] = useState([20, 80]);
    return (
      <RangeSliderPopover
        triggerText="Score"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        resetBtnText="Clear"
        applyBtnText="Save"
      />
    );
  },
};

export const MultipleFilters: Story = {
  render: () => {
    const [price, setPrice] = useState([0, 100]);
    const [duration, setDuration] = useState([15, 60]);
    return (
      <div className="flex gap-2">
        <RangeSliderPopover
          triggerText="Price"
          value={price}
          onChange={setPrice}
          min={0}
          max={200}
          inputLeading="$"
        />
        <RangeSliderPopover
          triggerText="Duration"
          value={duration}
          onChange={setDuration}
          min={5}
          max={120}
          inputSuffix="min"
        />
      </div>
    );
  },
};
