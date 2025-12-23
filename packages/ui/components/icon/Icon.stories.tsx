import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const meta = {
  component: Icon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    name: {
      description: "Icon name from the sprite",
      control: "text",
    },
    size: {
      description: "Size of the icon in pixels",
      control: { type: "number" },
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "calendar",
    size: 24,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <div className="text-center">
        <Icon name="calendar" size={12} className="stroke-current" />
        <p className="text-subtle mt-1 text-xs">12px</p>
      </div>
      <div className="text-center">
        <Icon name="calendar" size={16} className="stroke-current" />
        <p className="text-subtle mt-1 text-xs">16px</p>
      </div>
      <div className="text-center">
        <Icon name="calendar" size={20} className="stroke-current" />
        <p className="text-subtle mt-1 text-xs">20px</p>
      </div>
      <div className="text-center">
        <Icon name="calendar" size={24} className="stroke-current" />
        <p className="text-subtle mt-1 text-xs">24px</p>
      </div>
      <div className="text-center">
        <Icon name="calendar" size={32} className="stroke-current" />
        <p className="text-subtle mt-1 text-xs">32px</p>
      </div>
    </div>
  ),
};

export const CommonIcons: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-6">
      {[
        "calendar",
        "clock",
        "user",
        "users",
        "settings",
        "video",
        "link",
        "mail",
        "check",
        "x",
        "plus",
        "minus",
        "edit",
        "trash",
        "copy",
        "search",
        "bell",
        "lock",
      ].map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon name={name as IconName} size={24} className="stroke-current" />
          <span className="text-subtle text-xs">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const NavigationIcons: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-6">
      {[
        "arrow-left",
        "arrow-right",
        "arrow-up",
        "arrow-down",
        "chevron-left",
        "chevron-right",
        "chevron-up",
        "chevron-down",
        "external-link",
        "menu",
        "home",
        "log-out",
      ].map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon name={name as IconName} size={24} className="stroke-current" />
          <span className="text-subtle text-xs">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const StatusIcons: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="flex flex-col items-center gap-2">
        <Icon name="check" size={24} className="stroke-green-500" />
        <span className="text-xs text-green-500">Success</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="x" size={24} className="stroke-red-500" />
        <span className="text-xs text-red-500">Error</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="info" size={24} className="stroke-blue-500" />
        <span className="text-xs text-blue-500">Info</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="triangle-alert" size={24} className="stroke-yellow-500" />
        <span className="text-xs text-yellow-500">Warning</span>
      </div>
    </div>
  ),
};

export const WithColors: Story = {
  render: () => (
    <div className="flex gap-4">
      <Icon name="heart" size={24} className="stroke-red-500" />
      <Icon name="star" size={24} className="stroke-yellow-500" />
      <Icon name="check-circle" size={24} className="stroke-green-500" />
      <Icon name="info" size={24} className="stroke-blue-500" />
      <Icon name="triangle-alert" size={24} className="stroke-orange-500" />
    </div>
  ),
};
