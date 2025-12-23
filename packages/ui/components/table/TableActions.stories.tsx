import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { DropdownActions, TableActions } from "./TableActions";

const meta = {
  component: TableActions,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TableActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actions: [
      { id: "edit", label: "Edit", icon: "pencil", onClick: fn() },
      { id: "delete", label: "Delete", icon: "trash-2", color: "destructive", onClick: fn() },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    actions: [{ id: "view", label: "View Details", icon: "eye", onClick: fn() }],
  },
};

export const MultipleActions: Story = {
  args: {
    actions: [
      { id: "view", label: "View", icon: "eye", onClick: fn() },
      { id: "edit", label: "Edit", icon: "pencil", onClick: fn() },
      { id: "duplicate", label: "Duplicate", icon: "copy", onClick: fn() },
      { id: "delete", label: "Delete", icon: "trash-2", color: "destructive", onClick: fn() },
    ],
  },
};

export const WithLinks: Story = {
  args: {
    actions: [
      { id: "view", label: "View", icon: "eye", href: "#view" },
      { id: "edit", label: "Edit", icon: "pencil", href: "#edit" },
    ],
  },
};

export const WithDisabledAction: Story = {
  args: {
    actions: [
      { id: "edit", label: "Edit", icon: "pencil", onClick: fn() },
      { id: "delete", label: "Delete", icon: "trash-2", disabled: true, onClick: fn() },
    ],
  },
};

export const WithNestedActions: Story = {
  args: {
    actions: [
      { id: "edit", label: "Edit", icon: "pencil", onClick: fn() },
      {
        id: "more",
        label: "More",
        icon: "ellipsis",
        actions: [
          { id: "duplicate", label: "Duplicate", icon: "copy", onClick: fn() },
          { id: "archive", label: "Archive", icon: "archive", onClick: fn() },
          { id: "delete", label: "Delete", icon: "trash-2", color: "destructive", onClick: fn() },
        ],
      },
    ],
  },
};

export const BookingActions: Story = {
  args: {
    actions: [
      { id: "reschedule", label: "Reschedule", icon: "calendar", onClick: fn() },
      { id: "cancel", label: "Cancel", icon: "x", color: "destructive", onClick: fn() },
    ],
  },
};

export const DropdownOnly: StoryObj<typeof DropdownActions> = {
  render: () => (
    <DropdownActions
      actions={[
        { id: "edit", label: "Edit", icon: "pencil", onClick: fn() },
        { id: "duplicate", label: "Duplicate", icon: "copy", onClick: fn() },
        { id: "delete", label: "Delete", icon: "trash-2", color: "destructive", onClick: fn() },
      ]}
    />
  ),
};
