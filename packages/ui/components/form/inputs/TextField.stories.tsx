import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Input, InputField } from "./TextField";
import { EmailField, PasswordField, TextArea, FilterSearchField } from "./Input";

const meta = {
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    placeholder: {
      description: "Placeholder text",
      control: "text",
    },
    disabled: {
      description: "Whether the input is disabled",
      control: "boolean",
    },
    size: {
      description: "Size of the input",
      control: { type: "select" },
      options: ["sm", "md"],
    },
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "Hello, World!",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-1">Small</p>
        <Input size="sm" placeholder="Small input" />
      </div>
      <div>
        <p className="text-xs mb-1">Medium (default)</p>
        <Input size="md" placeholder="Medium input" />
      </div>
    </div>
  ),
};

export const InputFieldWithLabel: Story = {
  render: () => (
    <InputField
      name="username"
      label="Username"
      placeholder="Enter your username"
    />
  ),
};

export const InputFieldWithAddons: Story = {
  render: () => (
    <div className="space-y-4">
      <InputField
        name="website"
        label="Website"
        addOnLeading="https://"
        placeholder="example.com"
      />
      <InputField
        name="price"
        label="Price"
        addOnSuffix="USD"
        placeholder="0.00"
        type="number"
      />
      <InputField
        name="email"
        label="Email"
        addOnLeading="@"
        addOnSuffix=".com"
        placeholder="username"
      />
    </div>
  ),
};

export const InputFieldWithHint: Story = {
  render: () => (
    <InputField
      name="slug"
      label="Event URL"
      placeholder="my-event"
      hint="This will be your public event URL"
    />
  ),
};

export const InputFieldRequired: Story = {
  render: () => (
    <InputField
      name="email"
      label="Email Address"
      placeholder="you@example.com"
      required
      showAsteriskIndicator
    />
  ),
};

export const EmailFieldStory: Story = {
  render: () => (
    <EmailField
      name="email"
      label="Email"
      placeholder="you@example.com"
    />
  ),
  name: "Email Field",
};

export const PasswordFieldStory: Story = {
  render: () => (
    <PasswordField
      name="password"
      label="Password"
    />
  ),
  name: "Password Field",
};

export const TextAreaStory: Story = {
  render: () => (
    <div>
      <label className="text-sm font-medium mb-1 block">Description</label>
      <TextArea placeholder="Enter a description..." rows={4} />
    </div>
  ),
  name: "Text Area",
};

export const SearchField: Story = {
  render: () => (
    <FilterSearchField name="search" placeholder="Search..." />
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4">
      <InputField
        name="name"
        label="Full Name"
        placeholder="John Doe"
        required
        showAsteriskIndicator
      />
      <EmailField
        name="email"
        label="Email"
        placeholder="john@example.com"
        required
        showAsteriskIndicator
      />
      <PasswordField
        name="password"
        label="Password"
      />
      <InputField
        name="company"
        label="Company"
        placeholder="Acme Inc."
      />
      <div>
        <label className="text-sm font-medium mb-1 block">Bio</label>
        <TextArea placeholder="Tell us about yourself..." rows={3} />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
