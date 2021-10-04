import { CodeIcon, UserIcon } from "@heroicons/react/solid";
import React from "react";

import NavTabs from "./NavTabs";

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const tabs = [
    {
      name: "Profile",
      href: "/settings/profile",
      icon: UserIcon,
    },

    { name: "Embed", href: "/settings/embed", icon: CodeIcon },
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
