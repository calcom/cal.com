import InsightsNavigation from "@calid/features/ui/components/navigation/InsightsNavigation";
import type { ComponentProps } from "react";
import React from "react";

import Shell from "@calcom/features/shell/Shell";

export default function InsightsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell
      {...rest}
      title="Insights"
      description="Analytics and performance metrics for your scheduling activities">
      <InsightsNavigation baseURL="/insights" containerClassname="min-w-0 w-full">
        {children}
      </InsightsNavigation>
    </Shell>
  );
}
