import React from "react";

import NavTabs from "./NavTabs";

const tabs = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
  },
];

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavTabs tabs={tabs} />
      <main>{children}</main>
    </>
  );
}
