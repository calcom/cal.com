// Disabling until we figure out what is happening with the RouterMock.
import { ComponentMeta } from "@storybook/react";
import { Link } from "react-feather";

import { VerticalTabItem } from "@calcom/ui/v2";

export default {
  title: "VerticalTabItem",
  component: VerticalTabItem,
} as ComponentMeta<typeof VerticalTabItem>;

const TabItemProps = {
  name: "Event Setup",
  icon: Link,
  href: "/settings/event",
  info: "60 mins, Zoom",
};

export const Default = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <VerticalTabItem {...TabItemProps} />
  </div>
);
export const Active = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <VerticalTabItem {...TabItemProps} />
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
    <VerticalTabItem {...TabItemProps} disabled />
  </div>
);

export const NoIconNoInfo = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <VerticalTabItem name="Event Setup" href="/settings/event" />
  </div>
);

export const IconNoInfo = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <VerticalTabItem name="Event Setup" href="/settings/event" icon={Link} />
  </div>
);

export const IconNoInfoActive = () => (
  <div className="h-20 w-full bg-gray-100 p-4">
    <VerticalTabItem name="Event Setup" href="/settings/events" icon={Link} />
  </div>
);

IconNoInfoActive.paramaters = {
  nextRouter: {
    path: "/settings/[tab]",
    asPath: "/settings/events",
  },
};
