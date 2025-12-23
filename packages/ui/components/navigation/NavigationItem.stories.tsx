import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import type { NavigationItemType } from "./NavigationItem";
import { NavigationItem } from "./NavigationItem";

const meta = {
  component: NavigationItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "250px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavigationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: {
      name: "Dashboard",
      href: "#",
      icon: "layout-dashboard",
    },
  },
};

export const WithCurrentPage: Story = {
  args: {
    item: {
      name: "Event Types",
      href: "#",
      icon: "link",
      isCurrent: true,
    },
  },
};

export const WithBadge: Story = {
  args: {
    item: {
      name: "Bookings",
      href: "#",
      icon: "calendar",
      badge: <span className="bg-attention text-attention ml-2 rounded-full px-2 py-0.5 text-xs">3</span>,
    },
  },
};

export const Loading: Story = {
  args: {
    item: {
      name: "Syncing...",
      href: "#",
      icon: "calendar",
      isLoading: true,
    },
  },
};

export const WithChildren: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(true);
    const item: NavigationItemType = {
      name: "Settings",
      href: "#",
      icon: "settings",
      isExpanded,
      onToggle: () => setIsExpanded(!isExpanded),
      child: [
        { name: "General", href: "#" },
        { name: "Security", href: "#" },
        { name: "Notifications", href: "#" },
      ],
    };
    return <NavigationItem item={item} />;
  },
};

export const ChildItem: Story = {
  args: {
    item: {
      name: "Sub Item",
      href: "#",
    },
    isChild: true,
  },
};

export const MultipleItems: Story = {
  render: () => {
    const items: NavigationItemType[] = [
      { name: "Dashboard", href: "#", icon: "layout-dashboard" },
      { name: "Event Types", href: "#", icon: "link", isCurrent: true },
      { name: "Bookings", href: "#", icon: "calendar" },
      { name: "Availability", href: "#", icon: "clock" },
      { name: "Teams", href: "#", icon: "users" },
    ];
    return (
      <nav className="space-y-1">
        {items.map((item) => (
          <NavigationItem key={item.name} item={item} />
        ))}
      </nav>
    );
  },
};
