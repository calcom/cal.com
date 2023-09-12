import type { ComponentProps } from "react";
import React from "react";

import AppCategoryNavigation from "@calcom/app-store/_components/AppCategoryNavigation";
import Shell from "@calcom/features/shell/Shell";

export default function InstalledAppsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest} hideHeadingOnMobile>
      <AppCategoryNavigation baseURL="/apps/installed" containerClassname="min-w-0 w-full">
        {children}
      </AppCategoryNavigation>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <InstalledAppsLayout>{page}</InstalledAppsLayout>;
