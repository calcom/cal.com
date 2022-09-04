import React, { ComponentProps } from "react";

import { Icon } from "@calcom/ui";
import { VerticalTabs, VerticalTabItemProps, HorizontalTabs } from "@calcom/ui/v2/core/navigation/tabs";

import Shell from "../Shell";

const tabs: VerticalTabItemProps[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
    icon: Icon.FiCalendar,
  },
  // TODO: Add filter for unconfimred bookings in a future PR - Out of scope
  // {
  //   name: "unconfirmed",
  //   href: "/bookings/unconfirmed",
  //   icon: Icon.FiInbox,
  // },
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
      <div className="flex flex-col p-2 md:p-0 xl:flex-row ">
        <div className="hidden xl:block">
          <VerticalTabs tabs={tabs} sticky />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main className="w-full">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <BookingLayout>{page}</BookingLayout>;
