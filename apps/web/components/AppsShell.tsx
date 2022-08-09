import { useSession } from "next-auth/react";
import React from "react";

import NavTabs from "./NavTabs";

const tabs = [
  {
    name: "app_store",
    href: "/apps",
  },
  {
    name: "installed_apps",
    href: "/apps/installed",
  },
];

export default function AppsShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  return (
    <>
      <div className="mb-12 block lg:hidden">{status === "authenticated" && <NavTabs tabs={tabs} />}</div>
      <main className="pb-6">{children}</main>
    </>
  );
}
