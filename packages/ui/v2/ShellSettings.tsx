import React, { ComponentProps } from "react";

import ErrorBoundary from "../ErrorBoundary";
import { Icon } from "../Icon";
import Shell from "./Shell";
import NavTabs from "./navigation/tabs/VerticalTabs";

const tabs = [
  {
    name: "profile",
    href: "/settings/profile",
    icon: Icon.User,
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Icon.Users,
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Icon.Key,
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Icon.Terminal,
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: Icon.CreditCard,
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Icon.Lock,
    adminRequired: true,
  },
];

export default function ShellSettings({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="flex-grow-0 p-2">
        <NavTabs tabs={tabs} />
      </div>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Shell>
  );
}
