import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { ShellSubHeading } from "./ShellSubHeading";

const meta = {
  component: ShellSubHeading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShellSubHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Event Types",
  },
};

export const WithSubtitle: Story = {
  args: {
    title: "Event Types",
    subtitle: "Create events to share for people to book on your calendar.",
  },
};

export const WithActions: Story = {
  args: {
    title: "Team Members",
    subtitle: "Manage your team members and their roles.",
    actions: (
      <Button color="primary" StartIcon="plus">
        Add Member
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: "Integrations",
    subtitle: "Connect your favorite apps.",
    actions: (
      <div className="flex gap-2">
        <Button color="secondary">Import</Button>
        <Button color="primary" StartIcon="plus">
          Add Integration
        </Button>
      </div>
    ),
  },
};

export const TitleOnly: Story = {
  args: {
    title: "Settings",
  },
};

export const WithCustomClassName: Story = {
  args: {
    title: "Custom Styled",
    subtitle: "This section has custom styling applied.",
    className: "border-b border-subtle pb-4",
  },
};
