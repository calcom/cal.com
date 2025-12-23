import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@calcom/ui/components/button";

import SettingsHeaderWithBackButton from "./SettingsHeaderWithBackButton";

const meta = {
  component: SettingsHeaderWithBackButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsHeaderWithBackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Edit Profile",
    description: "Update your personal information",
    children: <div className="p-4">Content goes here</div>,
  },
};

export const WithCTA: Story = {
  args: {
    title: "Edit Team Settings",
    description: "Configure team members and permissions",
    CTA: (
      <Button color="primary" size="sm">
        Save Changes
      </Button>
    ),
    children: <div className="p-4">Team settings form</div>,
  },
};

export const WithMultipleCTAButtons: Story = {
  args: {
    title: "Billing Configuration",
    description: "Update your payment methods and subscription",
    CTA: (
      <div className="flex gap-2">
        <Button color="secondary" size="sm">
          Cancel
        </Button>
        <Button color="primary" size="sm">
          Save Changes
        </Button>
      </div>
    ),
    ctaClassName: "flex gap-2",
    children: <div className="p-4">Billing form content</div>,
  },
};

export const WithBorderInShellHeader: Story = {
  args: {
    title: "General Settings",
    description: "Configure your general preferences",
    borderInShellHeader: true,
    children: <div className="p-4">General settings content</div>,
  },
};

export const WithBorderAndCTA: Story = {
  args: {
    title: "API Configuration",
    description: "Manage your API keys and integrations",
    borderInShellHeader: true,
    CTA: (
      <Button color="secondary" size="sm" StartIcon="key">
        Generate Key
      </Button>
    ),
    children: <div className="p-4">API keys list</div>,
  },
};

export const WithIconCTA: Story = {
  args: {
    title: "Add Team Member",
    description: "Invite a new member to your team",
    CTA: (
      <Button color="primary" size="sm" StartIcon="plus">
        Add Member
      </Button>
    ),
    children: <div className="p-4">Add member form</div>,
  },
};

export const WithCustomCTAClassName: Story = {
  args: {
    title: "Notification Preferences",
    description: "Control how you receive notifications",
    CTA: (
      <div className="flex gap-2">
        <Button color="minimal" size="sm">
          Reset
        </Button>
        <Button color="primary" size="sm">
          Apply
        </Button>
      </div>
    ),
    ctaClassName: "flex gap-2",
    children: <div className="p-4">Notification settings content</div>,
  },
};

export const LongDescription: Story = {
  args: {
    title: "Security Settings",
    description:
      "Configure your security preferences including two-factor authentication, password requirements, and session management to keep your account secure",
    CTA: <Button color="primary">Save Settings</Button>,
    children: <div className="p-4">Security settings form</div>,
  },
};

export const MinimalContent: Story = {
  args: {
    title: "Quick Edit",
    description: "Make quick changes",
    children: <div className="p-2 text-sm">Minimal content area</div>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 w-[800px]">
      <div>
        <h3 className="text-sm font-semibold mb-4">Default</h3>
        <SettingsHeaderWithBackButton
          title="Edit Profile"
          description="Update your personal information">
          <div className="p-4 text-sm">Content area</div>
        </SettingsHeaderWithBackButton>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With CTA Button</h3>
        <SettingsHeaderWithBackButton
          title="Team Settings"
          description="Configure team preferences"
          CTA={<Button color="primary">Save</Button>}>
          <div className="p-4 text-sm">Content area</div>
        </SettingsHeaderWithBackButton>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With Border</h3>
        <SettingsHeaderWithBackButton
          title="API Settings"
          description="Manage API configuration"
          borderInShellHeader={true}
          CTA={<Button color="secondary">Generate</Button>}>
          <div className="p-4 text-sm">Content area</div>
        </SettingsHeaderWithBackButton>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With Multiple CTAs</h3>
        <SettingsHeaderWithBackButton
          title="Advanced Settings"
          description="Configure advanced options"
          CTA={
            <div className="flex gap-2">
              <Button color="minimal">Cancel</Button>
              <Button color="primary">Apply</Button>
            </div>
          }>
          <div className="p-4 text-sm">Content area</div>
        </SettingsHeaderWithBackButton>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
