import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { ITimezoneOption } from "./TimezoneSelect";
import { TimezoneSelectComponent } from "./TimezoneSelect";

const mockTimezones = [
  { label: "San Francisco", timezone: "America/Los_Angeles" },
  { label: "New York", timezone: "America/New_York" },
  { label: "Chicago", timezone: "America/Chicago" },
  { label: "Denver", timezone: "America/Denver" },
  { label: "London", timezone: "Europe/London" },
  { label: "Paris", timezone: "Europe/Paris" },
  { label: "Berlin", timezone: "Europe/Berlin" },
  { label: "Tokyo", timezone: "Asia/Tokyo" },
  { label: "Mumbai", timezone: "Asia/Kolkata" },
  { label: "Sydney", timezone: "Australia/Sydney" },
  { label: "Toronto", timezone: "America/Toronto" },
  { label: "Mexico City", timezone: "America/Mexico_City" },
  { label: "Dubai", timezone: "Asia/Dubai" },
  { label: "Singapore", timezone: "Asia/Singapore" },
  { label: "Hong Kong", timezone: "Asia/Hong_Kong" },
  { label: "Sao Paulo", timezone: "America/Sao_Paulo" },
  { label: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires" },
  { label: "Lagos", timezone: "Africa/Lagos" },
  { label: "Cairo", timezone: "Africa/Cairo" },
  { label: "Moscow", timezone: "Europe/Moscow" },
];

const meta = {
  component: TimezoneSelectComponent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
    isPending: false,
    data: mockTimezones,
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimezoneSelectComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Select timezone...",
  },
};

export const WithValue: Story = {
  args: {
    placeholder: "Select timezone...",
    value: {
      value: "America/New_York",
      label: "America/New_York",
    } as ITimezoneOption,
  },
};

export const Loading: Story = {
  args: {
    placeholder: "Loading timezones...",
    isPending: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Select timezone...",
    isDisabled: true,
  },
};

export const SmallSize: Story = {
  args: {
    placeholder: "Select timezone...",
    size: "sm",
  },
};

export const MediumSize: Story = {
  args: {
    placeholder: "Select timezone...",
    size: "md",
  },
};

export const WithGrow: Story = {
  args: {
    placeholder: "Select timezone...",
    grow: true,
  },
};

export const WithCustomValue: Story = {
  args: {
    placeholder: "Select timezone...",
    value: {
      value: "Asia/Tokyo",
      label: "Asia/Tokyo",
    } as ITimezoneOption,
  },
};

export const MultiSelect: Story = {
  args: {
    placeholder: "Select timezones...",
    isMulti: true,
  },
};

export const MultiSelectWithValues: Story = {
  args: {
    placeholder: "Select timezones...",
    isMulti: true,
    value: [
      {
        value: "America/New_York",
        label: "America/New_York",
      },
      {
        value: "Europe/London",
        label: "Europe/London",
      },
      {
        value: "Asia/Tokyo",
        label: "Asia/Tokyo",
      },
    ] as ITimezoneOption[],
  },
};

export const SmallMultiSelect: Story = {
  args: {
    placeholder: "Select timezones...",
    isMulti: true,
    size: "sm",
    value: [
      {
        value: "America/Los_Angeles",
        label: "America/Los_Angeles",
      },
      {
        value: "Europe/Paris",
        label: "Europe/Paris",
      },
    ] as ITimezoneOption[],
  },
};

export const WithoutWebTimezoneSelect: Story = {
  args: {
    placeholder: "Select timezone...",
    isWebTimezoneSelect: false,
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Primary Timezone</label>
        <TimezoneSelectComponent
          placeholder="Select your timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Additional Timezones</label>
        <TimezoneSelectComponent
          placeholder="Select additional timezones..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          isMulti
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Compact Timezone Selector</label>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          size="sm"
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const ComparisonSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-2 font-medium">Small Size</p>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          size="sm"
        />
      </div>
      <div>
        <p className="text-xs mb-2 font-medium">Medium Size (Default)</p>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          size="md"
        />
      </div>
    </div>
  ),
};

export const WithPreselectedTimezones: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">US Eastern Time</label>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          value={{
            value: "America/New_York",
            label: "America/New_York",
          }}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Central European Time</label>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          value={{
            value: "Europe/Berlin",
            label: "Europe/Berlin",
          }}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Japan Standard Time</label>
        <TimezoneSelectComponent
          placeholder="Select timezone..."
          isPending={false}
          data={mockTimezones}
          onChange={fn()}
          value={{
            value: "Asia/Tokyo",
            label: "Asia/Tokyo",
          }}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
