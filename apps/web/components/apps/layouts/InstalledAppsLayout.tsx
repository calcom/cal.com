import type { ComponentProps } from "react";
import React from "react";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import Shell from "@calcom/features/shell/Shell";

export default function InstalledAppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest} title="Installed Apps" description="Manage your installed apps or change settings">
      <AppCategoryNavigation
        baseURL="/apps/installed"
        classNames={{
          root: "flex flex-col gap-x-6 md:p-0 xl:flex-row",
          container: "min-w-0 w-full ltr:mr-2 rtl:ml-2",
          verticalTabsItem:
            "w-48 [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis",
        }}>
        {children}
      </AppCategoryNavigation>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
