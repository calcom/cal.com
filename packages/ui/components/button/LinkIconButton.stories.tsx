import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import LinkIconButton from "./LinkIconButton";

const meta = {
  component: LinkIconButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LinkIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Icon: "plus",
    children: "Add new item",
  },
};

export const Edit: Story = {
  args: {
    Icon: "edit",
    children: "Edit item",
  },
};

export const Delete: Story = {
  args: {
    Icon: "trash",
    children: "Delete item",
  },
};

export const Settings: Story = {
  args: {
    Icon: "settings",
    children: "Settings",
  },
};

export const Copy: Story = {
  args: {
    Icon: "copy",
    children: "Copy link",
  },
};

export const MultipleButtons: Story = {
  render: () => (
    <div className="space-y-1">
      <LinkIconButton Icon="plus">Add event type</LinkIconButton>
      <LinkIconButton Icon="copy">Duplicate</LinkIconButton>
      <LinkIconButton Icon="external-link">Preview</LinkIconButton>
      <LinkIconButton Icon="settings">Settings</LinkIconButton>
    </div>
  ),
};
