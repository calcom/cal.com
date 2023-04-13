import type { ComponentProps } from "react";
import React from "react";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import type { InstalledAppVariants } from "@calcom/app-store/utils";
import Shell from "@calcom/features/shell/Shell";
import { trpc } from "@calcom/trpc/react";
import type { HorizontalTabItemProps, VerticalTabItemProps } from "@calcom/ui";
import { BarChart, Calendar, CreditCard, Grid, Share2, Video } from "@calcom/ui/components/icon";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "calendar",
    href: "/apps/installed/calendar",
    icon: Calendar,
  },
  {
    name: "conferencing",
    href: "/apps/installed/conferencing",
    icon: Video,
  },
  {
    name: "payment",
    href: "/apps/installed/payment",
    icon: CreditCard,
  },
  {
    name: "automation",
    href: "/apps/installed/automation",
    icon: Share2,
  },
  {
    name: "analytics",
    href: "/apps/installed/analytics",
    icon: BarChart,
  },
  {
    name: "other",
    href: "/apps/installed/other",
    icon: Grid,
  },
];

export default function InstalledAppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const variant: (typeof InstalledAppVariants)[number] = "payment";

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
      <AppCategoryNavigation baseURL="/apps/installed" containerClassname="min-w-0 w-full">
        {children}
      </AppCategoryNavigation>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
