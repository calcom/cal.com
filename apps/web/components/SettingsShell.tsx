import type { ComponentProps } from "react";
import React from "react";

import Shell from "@calcom/features/shell/Shell";
import { ErrorBoundary } from "@calcom/ui";
import { CreditCard, Key, Lock, Terminal, User, Users } from "@calcom/ui/components/icon";

import NavTabs from "./NavTabs";

const tabs = [
  {
    name: "profile",
    href: "/settings/my-account/profile",
    icon: User,
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Users,
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Key,
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Terminal,
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Lock,
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
