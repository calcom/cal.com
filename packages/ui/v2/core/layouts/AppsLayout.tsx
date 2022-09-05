import React, { ComponentProps } from "react";

import HorizontalTabs from "@calcom/ui/v2/core/navigation/tabs/HorizontalTabs";
import type { VerticalTabItemProps } from "@calcom/ui/v2/core/navigation/tabs/VerticalTabItem";

import Shell from "../Shell";

const tabs: VerticalTabItemProps[] = [
  {
    name: "app_store",
    href: "/apps",
  },
  {
    name: "installed_apps",
    href: "/apps/installed",
  },
];

export default function AppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="flex flex-col p-2 md:p-0 xl:flex-row ">
        <div className="block lg:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main className="w-full">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <AppsLayout>{page}</AppsLayout>;
