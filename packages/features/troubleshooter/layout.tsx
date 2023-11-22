import type { ComponentProps } from "react";
import React, { Suspense } from "react";

import Shell from "@calcom/features/shell/Shell";
import { ErrorBoundary } from "@calcom/ui";
import { Loader } from "@calcom/ui/components/icon";

export default function TroubleshooterLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell withoutSeo={true} flexChildrenContainer hideHeadingOnMobile {...rest} SidebarContainer={<></>}>
      <div className="flex flex-1 [&>*]:flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <TroubleshooterLayout>{page}</TroubleshooterLayout>;
