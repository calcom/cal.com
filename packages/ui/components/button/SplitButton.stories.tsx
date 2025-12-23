import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SplitButton } from "./SplitButton";

const meta = {
  component: SplitButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Save",
    dropdown: {
      items: [
        { label: "Save as draft", action: fn() },
        { label: "Save and publish", action: fn() },
      ],
    },
  },
};

export const WithIcon: Story = {
  args: {
    children: "Create",
    StartIcon: "plus",
    dropdown: {
      items: [
        { label: "Create event type", action: fn(), icon: "calendar" },
        { label: "Create team", action: fn(), icon: "users" },
        { label: "Create workflow", action: fn(), icon: "zap" },
      ],
    },
  },
};

export const Secondary: Story = {
  args: {
    children: "Export",
    color: "secondary",
    dropdown: {
      items: [
        { label: "Export as CSV", action: fn() },
        { label: "Export as PDF", action: fn() },
        { label: "Export as JSON", action: fn() },
      ],
    },
  },
};

export const Minimal: Story = {
  args: {
    children: "Actions",
    color: "minimal",
    dropdown: {
      items: [
        { label: "Edit", action: fn(), icon: "edit" },
        { label: "Duplicate", action: fn(), icon: "copy" },
        { label: "Delete", action: fn(), icon: "trash" },
      ],
    },
  },
};

export const WithoutDropdown: Story = {
  args: {
    children: "Simple Button",
    StartIcon: "check",
  },
};

export const SmallSize: Story = {
  args: {
    children: "Share",
    size: "sm",
    dropdown: {
      items: [
        { label: "Copy link", action: fn() },
        { label: "Share via email", action: fn() },
      ],
    },
  },
};
