import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { InputError } from "./InputError";

const meta = {
  component: InputError,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InputError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "This field is required",
  },
};

export const InvalidEmail: Story = {
  args: {
    message: "Please enter a valid email address",
  },
};

export const PasswordTooShort: Story = {
  args: {
    message: "Password must be at least 8 characters long",
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="w-64">
      <label className="text-emphasis mb-2 block text-sm font-medium">Email</label>
      <input
        type="email"
        className="border-error w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Enter email"
        defaultValue="invalid-email"
      />
      <InputError message="Please enter a valid email address" />
    </div>
  ),
};

export const MultipleErrors: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="w-64">
        <label className="text-emphasis mb-2 block text-sm font-medium">Username</label>
        <input
          type="text"
          className="border-error w-full rounded-md border px-3 py-2 text-sm"
          defaultValue="ab"
        />
        <InputError message="Username must be at least 3 characters" />
      </div>
      <div className="w-64">
        <label className="text-emphasis mb-2 block text-sm font-medium">Password</label>
        <input type="password" className="border-error w-full rounded-md border px-3 py-2 text-sm" />
        <InputError message="Password is required" />
      </div>
    </div>
  ),
};
