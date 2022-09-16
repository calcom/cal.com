import React, { ComponentProps } from "react";

import Shell from "../Shell";
import type { HorizontalTabItemProps } from "../navigation/tabs/HorizontalTabItem";
import HorizontalTabs from "../navigation/tabs/HorizontalTabs";

const tabs: HorizontalTabItemProps[] = [
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
      <div className="flex flex-col xl:flex-row ">
        <div className="block lg:hidden">
          <HorizontalTabs tabs={tabs} />
        </div>
        <main className="w-full">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <AppsLayout>{page}</AppsLayout>;
