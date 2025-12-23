import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";

import { DatePicker } from "./DatePicker";

const meta = {
  title: "UI/Form/DatePicker",
  component: DatePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    date: { control: "date" },
    minDate: { control: "date" },
    disabled: { control: "boolean" },
    className: { control: "text" },
  },
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

export const WithMinDate: Story = {
  args: {
    date: new Date(),
    minDate: new Date(),
  },
};

export const WithPastDate: Story = {
  args: {
    date: new Date(2024, 0, 1), // January 1, 2024
  },
};

export const WithFutureDate: Story = {
  args: {
    date: new Date(2026, 11, 31), // December 31, 2026
  },
};

export const Disabled: Story = {
  args: {
    date: new Date(),
    disabled: true,
  },
};

export const WithMinDateRestriction: Story = {
  args: {
    date: new Date(2025, 0, 15), // January 15, 2025
    minDate: new Date(2025, 0, 1), // January 1, 2025 (restricts selection to dates after this)
  },
};

export const WithCustomClassName: Story = {
  args: {
    date: new Date(),
    className: "bg-blue-50 border-blue-300",
  },
};
