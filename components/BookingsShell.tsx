import React from "react";

import NavTabs from "./NavTabs";

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  const tabs = [
    {
      name: "Upcoming",
      href: "/meetings/upcoming",
    },
    {
      name: "Past",
      href: "/meetings/past",
    },
    {
      name: "Cancelled",
      href: "/meetings/cancelled",
    },
  ];

  return (
    <>
      <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
      <main>{children}</main>
    </>
  );
}
