import React, { ComponentProps } from "react";

import Shell from "@calcom/features/shell/Shell";
import { ErrorBoundary, Icon } from "@calcom/ui";

import NavTabs from "./NavTabs";

const tabs = [
  {
    name: "profile",
    href: "/settings/profile",
    icon: Icon.FiUser,
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Icon.FiUsers,
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Icon.FiKey,
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Icon.FiTerminal,
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: Icon.FiCreditCard,
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Icon.FiLock,
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
