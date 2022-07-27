import React, { ComponentProps } from "react";

import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";

import NavTabs from "./NavTabs";

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

export default function SettingsShell({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} />
      </div>
      <main className="max-w-4xl">
        <>
          <ErrorBoundary>{children}</ErrorBoundary>
        </>
      </main>
    </Shell>
  );
}
