import React, { ComponentProps } from "react";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import { InstalledAppVariants } from "@calcom/app-store/utils";
import Shell from "@calcom/features/shell/Shell";
import { trpc } from "@calcom/trpc/react";
import type { HorizontalTabItemProps, VerticalTabItemProps } from "@calcom/ui";
import { FiBarChart, FiCalendar, FiCreditCard, FiGrid, FiShare2, FiVideo } from "@calcom/ui/components/icon";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "calendar",
    href: "/apps/installed/calendar",
    icon: FiCalendar,
  },
  {
    name: "conferencing",
    href: "/apps/installed/conferencing",
    icon: FiVideo,
  },
  {
    name: "payment",
    href: "/apps/installed/payment",
    icon: FiCreditCard,
  },
  {
    name: "automation",
    href: "/apps/installed/automation",
    icon: FiShare2,
  },
  {
    name: "analytics",
    href: "/apps/installed/analytics",
    icon: FiBarChart,
  },
  {
    name: "other",
    href: "/apps/installed/other",
    icon: FiGrid,
  },
];

export default function InstalledAppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const variant: typeof InstalledAppVariants[number] = "payment";

  const query = trpc.viewer.integrations.useQuery({
    variant,
    onlyInstalled: true,
  });
  let actualTabs = tabs;
  if (query.data?.items.length === 0) {
    actualTabs = tabs.filter((tab) => tab.name !== variant);
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
