import { ComponentMeta } from "@storybook/react";
import { Link } from "react-feather";

import { TabItem } from "@calcom/ui/v2";

export default {
  title: "TabItem",
  component: TabItem,
  argTypes: {
    color: {
      options: ["primary", "secondary", "minimal", "destructive"],
      control: { type: "select" },
    },
    disabled: {
      options: [true, false],
      control: { type: "boolean" },
    },
    loading: {
      options: [true, false],
      control: { type: "boolean" },
    },
    size: {
      options: ["base", "lg", "icon"],
      control: { type: "radio" },
    },
  },
} as ComponentMeta<typeof TabItem>;

const TabItemProps = {
  name: "Event Setup",
  icon: Link,
  href: "/settings/event",
  info: "60 mins, Zoom",
};

export const Default = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem {...TabItemProps}></TabItem>
  </div>
);
export const Active = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem {...TabItemProps}></TabItem>
  </div>
);

// Mocking next router to show active state
Active.parameters = {
  nextRouter: {
    path: "/settings/[tab]",
    asPath: "/settings/event",
  },
};

export const Disabled = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem {...TabItemProps} disabled></TabItem>
  </div>
);

export const NoIconNoInfo = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem name="Event Setup" href="/settings/event"></TabItem>
  </div>
);

export const IconNoInfo = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem name="Event Setup" href="/settings/event" icon={Link}></TabItem>
  </div>
);

export const IconNoInfoActive = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <TabItem name="Event Setup" href="/settings/events" icon={Link}></TabItem>
  </div>
);

IconNoInfoActive.paramaters = {
  nextRouter: {
    path: "/settings/[tab]",
    asPath: "/settings/events",
  },
};
