import { NextRouter } from "next/router";
import React, { ComponentProps } from "react";

import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import HorizontalTabs from "@calcom/ui/v2/core/navigation/tabs/HorizontalTabs";
import type { VerticalTabItemProps } from "@calcom/ui/v2/core/navigation/tabs/VerticalTabItem";
import VerticalTabs from "@calcom/ui/v2/core/navigation/tabs/VerticalTabs";

import Shell from "../Shell";
import type { HorizontalTabItemProps } from "../navigation/tabs/HorizontalTabItem";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "calendar",
    href: "/apps/installed/calendar",
    icon: Icon.FiCalendar,
  },
  {
    name: "conferencing",
    href: "/apps/installed/conferencing",
    icon: Icon.FiVideo,
  },
  {
    name: "payment",
    href: "/apps/installed/payment",
    icon: Icon.FiCreditCard,
  },
  {
    name: "other",
    href: "/apps/installed/other",
    icon: Icon.FiGrid,
  },
];

export default function InstalledAppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const query = trpc.useQuery(["viewer.integrations", { variant: "payment", onlyInstalled: true }]);
  const actualTabs = query.data?.items.length === 0 ? tabs.filter((tab) => tab.name !== "payment") : tabs;
  return (
    <Shell {...rest}>
      <div className="mt-10 flex flex-col p-2 md:p-0 xl:flex-row">
        <div className="hidden xl:block">
          <VerticalTabs tabs={actualTabs} sticky />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={actualTabs} />
        </div>
        <main className="w-full xl:mx-5 xl:w-4/5 xl:pr-5">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
