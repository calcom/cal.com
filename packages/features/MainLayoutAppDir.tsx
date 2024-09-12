"use client";

import type { ComponentProps } from "react";
import React from "react";

import Shell from "@calcom/features/shell/Shell";

export type MainLayoutAppDirProps = { children: React.ReactNode } & ComponentProps<typeof Shell>;
export default function MainLayoutAppDir({ children, ...rest }: MainLayoutAppDirProps) {
  return (
    <Shell withoutMain={true} {...rest}>
      {children}
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <MainLayoutAppDir>{page}</MainLayoutAppDir>;
