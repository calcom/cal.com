import {
  CodeIcon,
  CreditCardIcon,
  KeyIcon,
  LockClosedIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/solid";
import React, { ComponentProps } from "react";

import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import Shell from "@calcom/ui/Shell";

import NavTabs from "./NavTabs";

const tabs = [
  {
    name: "profile",
    href: "/settings/profile",
    icon: UserIcon,
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: UserGroupIcon,
  },
  {
    name: "security",
    href: "/settings/security",
    icon: KeyIcon,
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: CodeIcon,
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: CreditCardIcon,
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: LockClosedIcon,
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
