"use client";

import type { ComponentProps } from "react";
import React from "react";

import Shell from "@calcom/features/shell/Shell";

export default function MainLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell withoutMain={true} {...rest}>
      {children}
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <MainLayout>{page}</MainLayout>;
