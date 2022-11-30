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

type AppsLayoutProps = {
  children: React.ReactNode;
  actions?: (className?: string) => JSX.Element;
} & Omit<ComponentProps<typeof Shell>, "actions">;

export default function AppsLayout({ children, actions, ...rest }: AppsLayoutProps) {
  return (
    <Shell {...rest} actions={actions?.("hidden sm:block")}>
      <div className="flex flex-col xl:flex-row">
        <div className="block lg:hidden">
          <HorizontalTabs tabs={tabs} actions={actions?.("ml-6 mr-4 mt-3 block sm:hidden")} />
        </div>
        <main className="w-full">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <AppsLayout>{page}</AppsLayout>;
