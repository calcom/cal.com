import React from "react";

import NavTabs from "./NavTabs";

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  const tabs = [
    {
      name: "Upcoming",
      href: "/bookings/upcoming",
    },
    {
      name: "Past",
      href: "/bookings/past",
    },
    {
      name: "Cancelled",
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
