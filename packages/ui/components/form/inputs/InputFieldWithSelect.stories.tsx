import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { InputFieldWithSelect } from "./InputFieldWithSelect";

const meta = {
  component: InputFieldWithSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      description: "Label for the input field",
      control: "text",
    },
    placeholder: {
      description: "Placeholder text",
      control: "text",
    },
    disabled: {
      description: "Whether the input is disabled",
      control: "boolean",
    },
    required: {
      description: "Whether the field is required",
      control: "boolean",
    },
    hint: {
      description: "Helper text displayed below the input",
      control: "text",
    },
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputFieldWithSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const durationOptions = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

const unitOptions = [
  { value: "px", label: "px" },
  { value: "rem", label: "rem" },
  { value: "em", label: "em" },
  { value: "%", label: "%" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "JPY", label: "JPY" },
];

export const Default: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const WithValue: Story = {
  args: {
    name: "duration",
    label: "Duration",
    defaultValue: "30",
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const Required: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    required: true,
    showAsteriskIndicator: true,
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const WithHint: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    hint: "Specify how long this event will last",
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const Disabled: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    disabled: true,
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      isDisabled: true,
      onChange: fn(),
    },
  },
};

export const WithError: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    error: "Duration is required",
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const PriceInput: Story = {
  args: {
    name: "price",
    label: "Price",
    placeholder: "0.00",
    type: "number",
    selectProps: {
      options: currencyOptions,
      defaultValue: currencyOptions[0],
      onChange: fn(),
    },
  },
};

export const DimensionInput: Story = {
  args: {
    name: "width",
    label: "Width",
    placeholder: "Enter width",
    type: "number",
    selectProps: {
      options: unitOptions,
      defaultValue: unitOptions[0],
      onChange: fn(),
    },
  },
};

export const SmallSize: Story = {
  args: {
    name: "duration",
    label: "Duration",
    placeholder: "Enter duration",
    size: "sm",
    selectProps: {
      options: durationOptions,
      defaultValue: durationOptions[1],
      onChange: fn(),
    },
  },
};

export const MultipleVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <InputFieldWithSelect
        name="duration"
        label="Event Duration"
        placeholder="Enter duration"
        selectProps={{
          options: durationOptions,
          defaultValue: durationOptions[1],
        }}
      />
      <InputFieldWithSelect
        name="price"
        label="Price"
        placeholder="0.00"
        type="number"
        hint="Set your pricing"
        selectProps={{
          options: currencyOptions,
          defaultValue: currencyOptions[0],
        }}
      />
      <InputFieldWithSelect
        name="dimension"
        label="Container Width"
        placeholder="Enter value"
        type="number"
        required
        showAsteriskIndicator
        selectProps={{
          options: unitOptions,
          defaultValue: unitOptions[0],
        }}
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
