import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "./Label";

const meta = {
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Email Address",
    htmlFor: "email",
  },
};

export const Required: Story = {
  render: () => (
    <Label htmlFor="name">
      Full Name <span className="text-error">*</span>
    </Label>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div>
      <Label htmlFor="bio">Bio</Label>
      <p className="text-subtle -mt-1 mb-2 text-sm">Tell us a bit about yourself</p>
    </div>
  ),
};

export const WithInput: Story = {
  render: () => (
    <div>
      <Label htmlFor="username">Username</Label>
      <input
        id="username"
        type="text"
        className="border-subtle w-64 rounded-md border px-3 py-2 text-sm"
        placeholder="Enter username"
      />
    </div>
  ),
};

export const MultipleLabels: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <input
          id="firstName"
          type="text"
          className="border-subtle w-64 rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <input
          id="lastName"
          type="text"
          className="border-subtle w-64 rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          type="email"
          className="border-subtle w-64 rounded-md border px-3 py-2 text-sm"
        />
      </div>
    </div>
  ),
};
