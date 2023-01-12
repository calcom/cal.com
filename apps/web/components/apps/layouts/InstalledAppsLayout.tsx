import React, { ComponentProps } from "react";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { InstalledAppVariants } from "@calcom/app-store/utils";
import Shell from "@calcom/features/shell/Shell";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import type { HorizontalTabItemProps, VerticalTabItemProps } from "@calcom/ui";

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
  const query = trpc.viewer.integrations.useQuery({
    variant: InstalledAppVariants.payment,
    onlyInstalled: true,
  });
  let actualTabs = tabs;
  if (query.data?.items.length === 0) {
    actualTabs = tabs.filter((tab) => tab.name !== InstalledAppVariants.payment);
  }

  return (
    <Shell {...rest}>
      <AppCategoryNavigation
        baseURL="/apps/installed"
        containerClassname="w-full xl:mx-5 xl:w-4/5 xl:max-w-2xl xl:pr-5">
        {children}
      </AppCategoryNavigation>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
