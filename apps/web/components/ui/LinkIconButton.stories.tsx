import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import LinkIconButton from "./LinkIconButton";

const meta = {
  component: LinkIconButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    Icon: {
      control: "text",
      description: "Icon name from the Cal.com icon set",
    },
    children: {
      control: "text",
      description: "Button text content",
    },
    onClick: {
      action: "clicked",
      description: "Click handler",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
  },
} satisfies Meta<typeof LinkIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Icon: "link",
    children: "Link Button",
  },
};

export const WithCalendarIcon: Story = {
  args: {
    Icon: "calendar",
    children: "Calendar",
  },
};

export const WithUserIcon: Story = {
  args: {
    Icon: "user",
    children: "Profile",
  },
};

export const WithSettingsIcon: Story = {
  args: {
    Icon: "settings",
    children: "Settings",
  },
};

export const WithPlusIcon: Story = {
  args: {
    Icon: "plus",
    children: "Add New",
  },
};

export const WithEditIcon: Story = {
  args: {
    Icon: "edit",
    children: "Edit",
  },
};

export const WithTrashIcon: Story = {
  args: {
    Icon: "trash",
    children: "Delete",
  },
};

export const WithCopyIcon: Story = {
  args: {
    Icon: "copy",
    children: "Copy",
  },
};

export const WithExternalLinkIcon: Story = {
  args: {
    Icon: "external-link",
    children: "Open External",
  },
};

export const Disabled: Story = {
  args: {
    Icon: "link",
    children: "Disabled Button",
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    Icon: "file-text",
    children: "Button with longer text content",
  },
};

export const ShortText: Story = {
  args: {
    Icon: "check",
    children: "OK",
  },
};

export const CommonVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <LinkIconButton Icon="calendar">Calendar</LinkIconButton>
      <LinkIconButton Icon="user">Profile</LinkIconButton>
      <LinkIconButton Icon="settings">Settings</LinkIconButton>
      <LinkIconButton Icon="plus">Add New</LinkIconButton>
      <LinkIconButton Icon="edit">Edit</LinkIconButton>
      <LinkIconButton Icon="copy">Copy</LinkIconButton>
      <LinkIconButton Icon="trash">Delete</LinkIconButton>
      <LinkIconButton Icon="external-link">Open Link</LinkIconButton>
    </div>
  ),
};

export const WithClickHandlers: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <LinkIconButton Icon="check" onClick={() => alert("Saved!")}>
        Save
      </LinkIconButton>
      <LinkIconButton Icon="x" onClick={() => alert("Cancelled!")}>
        Cancel
      </LinkIconButton>
      <LinkIconButton Icon="copy" onClick={() => alert("Copied!")}>
        Copy to Clipboard
      </LinkIconButton>
    </div>
  ),
};

export const NavigationButtons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <LinkIconButton Icon="arrow-left">Back</LinkIconButton>
      <LinkIconButton Icon="arrow-right">Next</LinkIconButton>
      <LinkIconButton Icon="home">Home</LinkIconButton>
      <LinkIconButton Icon="log-out">Sign Out</LinkIconButton>
    </div>
  ),
};

export const DisabledState: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <LinkIconButton Icon="link" disabled>
        Disabled Link
      </LinkIconButton>
      <LinkIconButton Icon="calendar" disabled>
        Disabled Calendar
      </LinkIconButton>
      <LinkIconButton Icon="settings" disabled>
        Disabled Settings
      </LinkIconButton>
    </div>
  ),
};
