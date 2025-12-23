import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@calcom/ui/components/button";

import Header from "./SettingsHeader";

const meta = {
  component: Header,
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
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Profile Settings",
    description: "Manage your profile information and preferences",
    children: <div className="p-4">Content goes here</div>,
  },
};

export const WithBackButton: Story = {
  args: {
    title: "Edit Profile",
    description: "Update your personal information",
    backButton: true,
    onBackButtonClick: () => console.log("Back button clicked"),
    children: <div className="p-4">Edit form content</div>,
  },
};

export const WithCTA: Story = {
  args: {
    title: "Billing Settings",
    description: "Manage your subscription and payment methods",
    CTA: (
      <Button color="primary" size="sm">
        Upgrade Plan
      </Button>
    ),
    children: <div className="p-4">Billing details</div>,
  },
};

export const WithBackButtonAndCTA: Story = {
  args: {
    title: "Team Settings",
    description: "Configure team members and permissions",
    backButton: true,
    onBackButtonClick: () => console.log("Back button clicked"),
    CTA: (
      <Button color="primary" size="sm" StartIcon="plus">
        Add Member
      </Button>
    ),
    children: <div className="p-4">Team management content</div>,
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
    title: "API Keys",
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

export const WithCustomCTAClassName: Story = {
  args: {
    title: "Notification Settings",
    description: "Control how you receive notifications",
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
    children: <div className="p-4">Notification preferences</div>,
  },
};

export const Loading: Story = {
  args: {
    children: <div className="p-4">Content that loads after suspension</div>,
  },
};

export const LongDescription: Story = {
  args: {
    title: "Security Settings",
    description:
      "Configure your security preferences including two-factor authentication, password requirements, and session management to keep your account secure",
    CTA: <Button color="primary">Save</Button>,
    children: <div className="p-4">Security settings form</div>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 w-[800px]">
      <div>
        <h3 className="text-sm font-semibold mb-4">Default</h3>
        <Header title="Profile Settings" description="Manage your profile information">
          <div className="p-4 text-sm">Content area</div>
        </Header>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With Back Button</h3>
        <Header
          title="Edit Profile"
          description="Update your information"
          backButton={true}
          onBackButtonClick={() => console.log("Back")}>
          <div className="p-4 text-sm">Content area</div>
        </Header>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With CTA Button</h3>
        <Header
          title="Billing"
          description="Manage subscription"
          CTA={<Button color="primary">Upgrade</Button>}>
          <div className="p-4 text-sm">Content area</div>
        </Header>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">With Border</h3>
        <Header
          title="Settings"
          description="Configure preferences"
          borderInShellHeader={true}
          CTA={<Button color="secondary">Save</Button>}>
          <div className="p-4 text-sm">Content area</div>
        </Header>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
