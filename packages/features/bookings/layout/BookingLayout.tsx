import React, { ComponentProps } from "react";

import { HorizontalTabs, Shell } from "@calcom/ui";
import { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui/v2";

import { EventTypeFilter} from "../components/EventTypeFilter";
import { TeamsMemberFilter } from "../components/TeamsMemberFilter";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
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

export default function BookingLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="flex max-w-6xl flex-col sm:space-x-2">
        <div className="flex  flex-col lg:flex-row">
          <HorizontalTabs tabs={tabs} />
          <div className="flex space-x-2">
            <TeamsMemberFilter />
            <EventTypeFilter />
          </div>
        </div>
        <main className="w-full max-w-6xl">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <BookingLayout>{page}</BookingLayout>;
