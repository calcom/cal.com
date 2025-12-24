import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import MinutesField from "./MinutesField";

const meta = {
  component: MinutesField,
  title: "Web/UI/Form/MinutesField",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MinutesField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "duration",
    name: "duration",
    defaultValue: 30,
    onChange: fn(),
  },
};

export const WithLabel: Story = {
  args: {
    id: "buffer-time",
    name: "bufferTime",
    label: "Buffer Time",
    defaultValue: 15,
    onChange: fn(),
  },
};

export const CustomValue: Story = {
  args: {
    id: "minimum-notice",
    name: "minimumNotice",
    label: "Minimum Notice",
    defaultValue: 60,
    onChange: fn(),
  },
};

export const ZeroValue: Story = {
  args: {
    id: "zero-buffer",
    name: "zeroBuffer",
    label: "No Buffer",
    defaultValue: 0,
    onChange: fn(),
  },
};

export const LongLabel: Story = {
  args: {
    id: "advance-notice",
    name: "advanceNotice",
    label: "Minimum booking notice before event starts",
    defaultValue: 120,
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    id: "disabled-field",
    name: "disabledField",
    label: "Duration (readonly)",
    defaultValue: 45,
    disabled: true,
    onChange: fn(),
  },
};

export const WithPlaceholder: Story = {
  args: {
    id: "placeholder-field",
    name: "placeholderField",
    label: "Event Duration",
    placeholder: "Enter duration",
    onChange: fn(),
  },
};

export const Required: Story = {
  args: {
    id: "required-field",
    name: "requiredField",
    label: "Required Duration",
    defaultValue: 30,
    required: true,
    onChange: fn(),
  },
};
