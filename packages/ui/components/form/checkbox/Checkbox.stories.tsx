import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Checkbox, CheckboxField } from "./Checkbox";

const meta = {
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      description: "Whether the checkbox is checked",
      control: "boolean",
    },
    disabled: {
      description: "Whether the checkbox is disabled",
      control: "boolean",
    },
  },
  args: {
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Accept terms and conditions
      </label>
    </div>
  ),
};

export const CheckboxFieldDefault: Story = {
  render: () => (
    <CheckboxField
      label="Email notifications"
      description="Receive email updates about your bookings"
      defaultChecked
    />
  ),
};

export const CheckboxFieldWithError: Story = {
  render: () => (
    <CheckboxField
      label="Required agreement"
      description="You must accept the terms to continue"
      error
    />
  ),
};

export const CheckboxFieldDisabled: Story = {
  render: () => (
    <CheckboxField
      label="Premium feature"
      description="This feature is only available on paid plans"
      disabled
      defaultChecked
    />
  ),
};

export const CheckboxGroup: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Notification Preferences</h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="email" defaultChecked />
          <label htmlFor="email" className="text-sm">
            Email notifications
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="sms" />
          <label htmlFor="sms" className="text-sm">
            SMS notifications
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="push" defaultChecked />
          <label htmlFor="push" className="text-sm">
            Push notifications
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="marketing" />
          <label htmlFor="marketing" className="text-sm">
            Marketing emails
          </label>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <CheckboxField
        label="Email me about"
        description="New booking confirmations"
        defaultChecked
      />
      <CheckboxField
        label=""
        description="Booking reminders (24 hours before)"
        defaultChecked
      />
      <CheckboxField
        label=""
        description="Cancellation notifications"
        defaultChecked
      />
      <CheckboxField
        label=""
        description="Weekly summary reports"
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
