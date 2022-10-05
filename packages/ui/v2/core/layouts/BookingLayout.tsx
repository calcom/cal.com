import React, { ComponentProps } from "react";

import { Icon } from "@calcom/ui";
import HorizontalTabs from "@calcom/ui/v2/core/navigation/tabs/HorizontalTabs";
import type { VerticalTabItemProps } from "@calcom/ui/v2/core/navigation/tabs/VerticalTabItem";
import VerticalTabs from "@calcom/ui/v2/core/navigation/tabs/VerticalTabs";

import Shell from "../Shell";
import type { HorizontalTabItemProps } from "../navigation/tabs/HorizontalTabItem";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
    icon: Icon.FiCalendar,
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
    icon: Icon.FiInbox,
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
    icon: Icon.FiRotateCcw,
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

export default function BookingLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="flex flex-col sm:space-x-2 xl:flex-row">
        <div className="hidden xl:block">
          <VerticalTabs tabs={tabs} sticky />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main className="w-full max-w-6xl">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <BookingLayout>{page}</BookingLayout>;
