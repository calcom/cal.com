import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Select, SelectField } from "./Select";

type Option = { label: string; value: string };

const options: Option[] = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "60 minutes", value: "60" },
];

const meta = {
  component: Select,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select<Option>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options,
    placeholder: "Select duration...",
  },
};

export const WithValue: Story = {
  args: {
    options,
    value: options[1],
  },
};

export const Disabled: Story = {
  args: {
    options,
    placeholder: "Disabled select",
    isDisabled: true,
  },
};

export const Searchable: Story = {
  args: {
    options,
    placeholder: "Search options...",
    isSearchable: true,
  },
};

export const Clearable: Story = {
  args: {
    options,
    value: options[0],
    isClearable: true,
  },
};

export const Loading: Story = {
  args: {
    options,
    placeholder: "Loading...",
    isLoading: true,
  },
};

export const Small: Story = {
  args: {
    options,
    placeholder: "Small select",
    size: "sm",
  },
};

export const MultiSelect: Story = {
  args: {
    options,
    placeholder: "Select multiple...",
    isMulti: true,
  },
};

export const MultiSelectWithValues: Story = {
  args: {
    options,
    value: [options[0], options[2]],
    isMulti: true,
  },
};

export const WithGroups: Story = {
  args: {
    options: [
      {
        label: "Short meetings",
        options: [
          { label: "15 minutes", value: "15" },
          { label: "30 minutes", value: "30" },
        ],
      },
      {
        label: "Long meetings",
        options: [
          { label: "45 minutes", value: "45" },
          { label: "60 minutes", value: "60" },
          { label: "90 minutes", value: "90" },
        ],
      },
    ],
    placeholder: "Select duration...",
  },
};

export const SelectFieldWithLabel: Story = {
  render: () => (
    <SelectField
      label="Duration"
      name="duration"
      options={options}
      placeholder="Select duration..."
    />
  ),
};

export const SelectFieldRequired: Story = {
  render: () => (
    <SelectField
      label="Duration"
      name="duration"
      options={options}
      placeholder="Select duration..."
      required
    />
  ),
};

export const TimezoneExample: Story = {
  args: {
    options: [
      { label: "America/New_York (EST)", value: "America/New_York" },
      { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles" },
      { label: "America/Chicago (CST)", value: "America/Chicago" },
      { label: "Europe/London (GMT)", value: "Europe/London" },
      { label: "Europe/Paris (CET)", value: "Europe/Paris" },
      { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
      { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
      { label: "Australia/Sydney (AEST)", value: "Australia/Sydney" },
    ],
    placeholder: "Select timezone...",
    isSearchable: true,
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4">
      <SelectField
        label="Event Type"
        name="eventType"
        options={[
          { label: "One-on-One", value: "one-on-one" },
          { label: "Group Meeting", value: "group" },
          { label: "Round Robin", value: "round-robin" },
        ]}
        placeholder="Select event type..."
      />
      <SelectField
        label="Duration"
        name="duration"
        options={options}
        placeholder="Select duration..."
      />
      <SelectField
        label="Location"
        name="location"
        options={[
          { label: "Google Meet", value: "google-meet" },
          { label: "Zoom", value: "zoom" },
          { label: "Microsoft Teams", value: "teams" },
          { label: "Phone Call", value: "phone" },
          { label: "In Person", value: "in-person" },
        ]}
        placeholder="Select location..."
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
