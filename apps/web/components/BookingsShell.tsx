import React from "react";

import { Icon } from "@calcom/ui";
import { VerticalTabs, VerticalTabItemProps, HorizontalTabs } from "@calcom/ui/v2/navigation/tabs";

const tabs: VerticalTabItemProps[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
    icon: Icon.Calendar,
  },
  {
    name: "Unconfirmed",
    href: "/bookings/unconfirmed",
    icon: Icon.Inbox,
  },
  {
    name: "past",
    href: "/bookings/past",
    icon: Icon.Sunset,
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
    icon: Icon.Slash,
  },
];

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col xl:flex-row">
        <div className="hidden xl:block">
          <VerticalTabs tabs={tabs} />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main>{children}</main>
      </div>
    </>
  );
}
