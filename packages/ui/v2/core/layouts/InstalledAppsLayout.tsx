import React, { ComponentProps } from "react";

import { InstalledAppVariants } from "@calcom/app-store/utils";
import { trpc } from "@calcom/trpc/react";

import { Icon } from "../../../Icon";
import Shell from "../Shell";
import type { HorizontalTabItemProps } from "../navigation/tabs/HorizontalTabItem";
import HorizontalTabs from "../navigation/tabs/HorizontalTabs";
import type { VerticalTabItemProps } from "../navigation/tabs/VerticalTabItem";
import VerticalTabs from "../navigation/tabs/VerticalTabs";

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
    name: "automation",
    href: "/apps/installed/automation",
    icon: Icon.FiShare2,
  },
  {
    name: "analytics",
    href: "/apps/installed/analytics",
    icon: Icon.FiBarChart,
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
  const query = trpc.useQuery([
    "viewer.integrations",
    { variant: InstalledAppVariants.payment, onlyInstalled: true },
  ]);
  let actualTabs = tabs;
  if (query.data?.items.length === 0) {
    actualTabs = tabs.filter((tab) => tab.name !== InstalledAppVariants.payment);
  }
  return (
    <Shell {...rest}>
      <div className="flex flex-col p-2 md:p-0 xl:flex-row">
        <div className="hidden xl:block">
          <VerticalTabs tabs={actualTabs} sticky linkProps={{ shallow: true }} />
        </div>
        <div className="block xl:hidden">
          <HorizontalTabs tabs={actualTabs} linkProps={{ shallow: true }} />
        </div>
        <main className="w-full xl:mx-5 xl:w-4/5 xl:pr-5">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
