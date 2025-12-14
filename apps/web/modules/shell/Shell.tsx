"use client";

import type { ComponentProps } from "react";

import BaseShell from "@calcom/features/shell/Shell";

import { MobileNavigationContainer } from "./navigation/Navigation";
import { SideBarContainer } from "./SideBar";

export type { LayoutProps } from "@calcom/features/shell/Shell";
export { ShellMain } from "@calcom/features/shell/Shell";

/**
 * Shell wrapper that provides the default MobileNavigationContainer and SidebarContainer from the web layer.
 * This allows the features package to remain independent of trpc-using components.
 */
export default function Shell({
  MobileNavigationContainer: MobileNavigationContainerProp,
  SidebarContainer: SidebarContainerProp,
  isPlatformUser,
  ...props
}: ComponentProps<typeof BaseShell>) {
  return (
    <BaseShell
      {...props}
      isPlatformUser={isPlatformUser}
      SidebarContainer={
        SidebarContainerProp ?? <SideBarContainer isPlatformUser={isPlatformUser} bannersHeight={0} />
      }
      MobileNavigationContainer={
        MobileNavigationContainerProp ?? <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
      }
    />
  );
}
