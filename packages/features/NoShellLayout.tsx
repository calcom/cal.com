import type { ComponentProps } from "react";
import React from "react";

import Shell from "@calcom/features/shell/Shell";

export default function NoShellLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell noMenu={true} {...rest}>
      {children}
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <NoShellLayout>{page}</NoShellLayout>;
