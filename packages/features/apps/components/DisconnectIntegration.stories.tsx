import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import DisconnectIntegration from "./DisconnectIntegration";

const meta = {
  component: DisconnectIntegration,
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  argTypes: {
    credentialId: {
      control: "number",
      description: "The ID of the credential to disconnect",
    },
    teamId: {
      control: "number",
      description: "Optional team ID if this is a team credential",
    },
    label: {
      control: "text",
      description: "Optional button label text",
    },
    trashIcon: {
      control: "boolean",
      description: "Whether to show trash icon",
    },
    isGlobal: {
      control: "boolean",
      description: "Whether this is a global integration (disables disconnect)",
    },
  },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DisconnectIntegration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    credentialId: 1,
    onSuccess: fn(),
  },
};

export const WithLabel: Story = {
  args: {
    credentialId: 2,
    label: "Disconnect",
    onSuccess: fn(),
  },
};

export const WithTrashIcon: Story = {
  args: {
    credentialId: 3,
    trashIcon: true,
    onSuccess: fn(),
  },
};

export const WithTrashIconAndLabel: Story = {
  args: {
    credentialId: 4,
    label: "Remove Integration",
    trashIcon: true,
    onSuccess: fn(),
  },
};

export const TeamIntegration: Story = {
  args: {
    credentialId: 5,
    teamId: 123,
    label: "Disconnect Team App",
    trashIcon: true,
    onSuccess: fn(),
  },
};

export const GlobalIntegration: Story = {
  args: {
    credentialId: 6,
    label: "Global Integration",
    trashIcon: true,
    isGlobal: true,
    onSuccess: fn(),
  },
};

export const CustomButtonProps: Story = {
  args: {
    credentialId: 7,
    label: "Custom Style",
    buttonProps: {
      color: "secondary",
      size: "sm",
    },
    onSuccess: fn(),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <DisconnectIntegration credentialId={10} onSuccess={fn()} />
        <span className="text-subtle text-sm">Default (no label, no icon)</span>
      </div>
      <div className="flex items-center gap-4">
        <DisconnectIntegration credentialId={11} label="Disconnect" onSuccess={fn()} />
        <span className="text-subtle text-sm">With label</span>
      </div>
      <div className="flex items-center gap-4">
        <DisconnectIntegration credentialId={12} trashIcon onSuccess={fn()} />
        <span className="text-subtle text-sm">Icon only</span>
      </div>
      <div className="flex items-center gap-4">
        <DisconnectIntegration credentialId={13} label="Remove App" trashIcon onSuccess={fn()} />
        <span className="text-subtle text-sm">Icon with label</span>
      </div>
      <div className="flex items-center gap-4">
        <DisconnectIntegration credentialId={14} label="Global App" isGlobal onSuccess={fn()} />
        <span className="text-subtle text-sm">Global (disabled)</span>
      </div>
    </div>
  ),
};
