import { CodeIcon, CreditCardIcon, KeyIcon, UserGroupIcon, UserIcon } from "@heroicons/react/solid";
import React from "react";

import NavTabs from "./NavTabs";

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const tabs = [
    {
      name: "Profile",
      href: "/settings/profile",
      icon: UserIcon,
    },
    {
      name: "Security",
      href: "/settings/security",
      icon: KeyIcon,
    },
    { name: "Embed & Webhooks", href: "/settings/embed", icon: CodeIcon },
    {
      name: "Teams",
      href: "/settings/teams",
      icon: UserGroupIcon,
    },
    {
      name: "Billing",
      href: "/settings/billing",
      icon: CreditCardIcon,
    },
  ];

  return (
    <>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} />
      </div>
      <main className="max-w-4xl">{children}</main>
    </>
  );
}
