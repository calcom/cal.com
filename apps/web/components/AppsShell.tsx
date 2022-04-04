import { useSession } from "next-auth/react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "./NavTabs";

export default function AppsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { status } = useSession();
  const tabs = [
    {
      name: t("app_store"),
      href: "/apps",
    },
    {
      name: t("installed_apps"),
      href: "/apps/installed",
    },
  ];

  return (
    <>
      <div className="mb-12 block lg:hidden">
        {status === "authenticated" && <NavTabs tabs={tabs} linkProps={{ shallow: true }} />}
      </div>
      <main>{children}</main>
    </>
  );
}
