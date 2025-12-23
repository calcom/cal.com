import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { VerticalTabItemProps } from "./VerticalTabItem";
import NavTabs from "./VerticalTabs";

const meta = {
  component: NavTabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NavTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultTabs: VerticalTabItemProps[] = [
  { name: "general", href: "#general", icon: "settings" },
  { name: "security", href: "#security", icon: "lock" },
  { name: "calendars", href: "#calendars", icon: "calendar" },
  { name: "conferencing", href: "#conferencing", icon: "video" },
];

export const Default: Story = {
  args: {
    tabs: defaultTabs,
  },
};

export const WithInfo: Story = {
  args: {
    tabs: [
      { name: "profile", href: "#profile", icon: "user", info: "Manage your profile" },
      { name: "billing", href: "#billing", icon: "credit-card", info: "View and manage billing" },
      { name: "team", href: "#team", icon: "users", info: "Team settings" },
    ],
  },
};

export const WithDisabledItems: Story = {
  args: {
    tabs: [
      { name: "available", href: "#available", icon: "check" },
      { name: "disabled_option", href: "#disabled", icon: "ban", disabled: true },
      { name: "another_available", href: "#another", icon: "star" },
    ],
  },
};

export const WithNestedChildren: Story = {
  args: {
    tabs: [
      {
        name: "appearance",
        href: "#appearance",
        icon: "palette",
        children: [
          { name: "theme", href: "#theme" },
          { name: "layout", href: "#layout" },
        ],
      },
      { name: "notifications", href: "#notifications", icon: "bell" },
    ],
  },
};

export const Sticky: Story = {
  args: {
    tabs: defaultTabs,
    sticky: true,
  },
  decorators: [
    (Story) => (
      <div style={{ height: "400px", overflow: "auto" }}>
        <Story />
        <div style={{ height: "800px" }} />
      </div>
    ),
  ],
};

export const WithExternalLinks: Story = {
  args: {
    tabs: [
      { name: "dashboard", href: "#dashboard", icon: "layout-dashboard" },
      { name: "documentation", href: "https://cal.com/docs", icon: "book-open", isExternalLink: true },
      { name: "support", href: "https://cal.com/support", icon: "help-circle", isExternalLink: true },
    ],
  },
};

export const CustomItemClassName: Story = {
  args: {
    tabs: defaultTabs,
    itemClassname: "rounded-lg",
    iconClassName: "text-blue-500",
  },
};
