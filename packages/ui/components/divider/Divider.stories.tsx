import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Divider, VerticalDivider } from "./Divider";

const meta = {
  component: Divider,
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
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <p className="text-sm">Content above divider</p>
      <Divider />
      <p className="text-sm">Content below divider</p>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div className="border-subtle rounded-lg border p-4">
      <h3 className="font-semibold">Section Title</h3>
      <p className="text-subtle text-sm">Some description text here.</p>
      <Divider className="my-4" />
      <h3 className="font-semibold">Another Section</h3>
      <p className="text-subtle text-sm">More content in this section.</p>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div className="space-y-0">
      <div className="py-2">
        <p className="font-medium">Item One</p>
        <p className="text-subtle text-sm">Description for item one</p>
      </div>
      <Divider />
      <div className="py-2">
        <p className="font-medium">Item Two</p>
        <p className="text-subtle text-sm">Description for item two</p>
      </div>
      <Divider />
      <div className="py-2">
        <p className="font-medium">Item Three</p>
        <p className="text-subtle text-sm">Description for item three</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center">
      <span className="text-sm">Home</span>
      <VerticalDivider />
      <span className="text-sm">Settings</span>
      <VerticalDivider />
      <span className="text-sm">Profile</span>
    </div>
  ),
};

export const VerticalInHeader: Story = {
  render: () => (
    <div className="border-subtle flex items-center gap-2 rounded-lg border p-3">
      <button className="text-sm font-medium">Dashboard</button>
      <VerticalDivider />
      <button className="text-subtle text-sm">Bookings</button>
      <VerticalDivider />
      <button className="text-subtle text-sm">Event Types</button>
      <VerticalDivider />
      <button className="text-subtle text-sm">Availability</button>
    </div>
  ),
};

export const FormSections: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Personal Information</h4>
        <p className="text-subtle text-sm">Update your personal details.</p>
      </div>
      <Divider className="my-6" />
      <div>
        <h4 className="font-medium">Security</h4>
        <p className="text-subtle text-sm">Manage your password and 2FA settings.</p>
      </div>
      <Divider className="my-6" />
      <div>
        <h4 className="font-medium">Notifications</h4>
        <p className="text-subtle text-sm">Configure how you receive notifications.</p>
      </div>
    </div>
  ),
};
