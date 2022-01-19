import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

import NavTabs from "./NavTabs";

export default function AppsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
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
      <div className="block mb-12 lg:hidden">
        <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
      </div>
      <main>{children}</main>
    </>
  );
}
