import React from "react";

import { useLocale } from "@lib/hooks/useLocale";

import NavTabs from "./NavTabs";

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const tabs = [
    {
      name: t("upcoming"),
      href: "/bookings/upcoming",
    },
    {
      name: t("past"),
      href: "/bookings/past",
    },
    {
      name: t("cancelled"),
      href: "/bookings/cancelled",
    },
  ];

  return (
    <>
      <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
      <main>{children}</main>
    </>
  );
}
