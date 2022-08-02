import React from "react";

import { Icon } from "@calcom/ui";
import { VerticalTabs, VerticalTabItemProps, HorizontalTabs } from "@calcom/ui/v2/navigation/tabs";

const tabs: VerticalTabItemProps[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
    icon: Icon.FiCalendar,
  },
  {
    name: "Unconfirmed",
    href: "/bookings/unconfirmed",
    icon: Icon.FiInbox,
  },
  {
    name: "past",
    href: "/bookings/past",
    icon: Icon.FiSunset,
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
    icon: Icon.FiSlash,
  },
];

export default function BookingsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="-mx-4 flex flex-col md:m-0 xl:flex-row">
        <div className="hidden xl:block">
          <VerticalTabs tabs={tabs} />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main className="w-full">{children}</main>
      </div>
    </>
  );
}
