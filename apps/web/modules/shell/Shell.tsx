"use client";

import type { ComponentProps } from "react";

import BaseShell from "@calcom/features/shell/Shell";

import { MobileNavigationContainer } from "./navigation/Navigation";

export type { LayoutProps } from "@calcom/features/shell/Shell";
export { ShellMain } from "@calcom/features/shell/Shell";

/**
 * Shell wrapper that provides the default MobileNavigationContainer from the web layer.
 * This allows the features package to remain independent of trpc-using components.
 */
export default function Shell({
  MobileNavigationContainer: MobileNavigationContainerProp,
  isPlatformUser,
  ...props
}: ComponentProps<typeof BaseShell>) {
  return (
    <BaseShell
      {...props}
      isPlatformUser={isPlatformUser}
      MobileNavigationContainer={
        MobileNavigationContainerProp ?? <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
      }
    />
  );
}
