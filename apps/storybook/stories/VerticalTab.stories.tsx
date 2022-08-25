// Disabling until we figure out what is happening with the RouterMock.
import { ComponentMeta } from "@storybook/react";
import { Calendar, Clock, Grid, Link, RefreshCw, User, Users } from "react-feather";

import { VerticalTabs } from "@calcom/ui/v2";

export default {
  title: "Vertical Tabs",
  component: VerticalTabs,
} as ComponentMeta<typeof VerticalTabs>;

const VerticalTabsPropsDefault = [
  {
    name: "Security",
    icon: Link,
    href: "/security",
  },
  {
    name: "Profile",
    icon: User,
    href: "/profile",
  },
  {
    name: "Calendar Sync",
    icon: RefreshCw,
    href: "/cal-sync",
  },
  {
    name: "Teams",
    icon: Users,
    href: "/Teams",
  },
];

export const Default = () => (
  <div className="w-full p-4" style={{ backgroundColor: "#F9FAFB" }}>
    <VerticalTabs tabs={VerticalTabsPropsDefault} />
  </div>
);

Default.parameters = {
  nextRouter: {
    path: "/[page]",
    asPath: "/profile",
  },
};

const VerticalTabsPropsInfo = [
  {
    name: "Event Setup",
    icon: Link,
    href: "/events",
    info: "60 Mins, Zoom",
  },
  {
    name: "Availability",
    icon: Calendar,
    href: "/availability",
    info: "Working Hours",
  },
  {
    name: "Limits",
    icon: Clock,
    href: "/limits",
    info: "Buffers, Limits & more...",
  },
  {
    name: "Apps",
    icon: Grid,
    href: "/apps",
    info: "3 apps - 0 active",
  },
];

export const Info = () => (
  <div className="w-full p-4" style={{ backgroundColor: "#F9FAFB" }}>
    <VerticalTabs tabs={VerticalTabsPropsInfo} />
  </div>
);
Info.parameters = {
  nextRouter: {
    path: "/[page]",
    asPath: "/events",
  },
};
