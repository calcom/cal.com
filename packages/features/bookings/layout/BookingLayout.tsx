import React, { ComponentProps } from "react";

import Shell from "@calcom/features/shell/Shell";
import { HorizontalTabs } from "@calcom/ui";
import { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui";

import { FiltersContainer } from "../components/FiltersContainer";

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
      <div className="flex max-w-6xl flex-col">
        <div className="flex flex-col gap-2 lg:flex-row">
          <HorizontalTabs tabs={tabs} />
          <div className="overflow-x-auto lg:ml-auto">
            <FiltersContainer />
          </div>
        </div>
        <main className="w-full max-w-6xl">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <BookingLayout>{page}</BookingLayout>;
