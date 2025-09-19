"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import React, { useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import classNames from "@calcom/ui/classNames";
import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

import { useSettingsStore } from "../_lib/stores/settings-store";
import type { PermissionContext } from "../_lib/tabs/types";
import MobileSettingsContainer from "./_components/MobileSettingsContainer";
import SettingsSidebar from "./_components/SettingsSidebar";

export type SettingsLayoutProps = {
  children: React.ReactNode;
  containerClassName?: string;
  permissionContext: PermissionContext;
  teams?: any[];
  otherTeams?: any[];
  user?: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  organization?: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
} & ComponentProps<typeof Shell>;

export default function SettingsLayoutAppDirClientNew({
  children,
  permissionContext,
  teams,
  otherTeams,
  user,
  organization,
  ...rest
}: SettingsLayoutProps) {
  const pathname = usePathname();
  const [sideContainerOpen, setSideContainerOpen] = React.useState(false);
  const initializeTabs = useSettingsStore((state) => state.initializeTabs);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  // Initialize the store with permission context and teams
  useEffect(() => {
    if (!isInitialized && permissionContext) {
      initializeTabs(permissionContext, teams, otherTeams);
    }
  }, [permissionContext, teams, otherTeams, initializeTabs, isInitialized]);

  // Close mobile sidebar on resize
  useEffect(() => {
    const closeSideContainer = () => {
      if (window.innerWidth >= 1024) {
        setSideContainerOpen(false);
      }
    };

    window.addEventListener("resize", closeSideContainer);
    return () => {
      window.removeEventListener("resize", closeSideContainer);
    };
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (sideContainerOpen) {
      setSideContainerOpen(false);
    }
  }, [pathname]);

  return (
    <Shell
      flexChildrenContainer
      {...rest}
      SidebarContainer={
        <SettingsSidebar
          sideContainerOpen={sideContainerOpen}
          setSideContainerOpen={setSideContainerOpen}
          user={user}
          organization={organization}
        />
      }
      drawerState={[sideContainerOpen, setSideContainerOpen]}
      MobileNavigationContainer={null}
      TopNavContainer={
        <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
      }>
      <div className="flex flex-1 [&>*]:flex-1">
        <div
          className={classNames("mx-auto max-w-full justify-center lg:max-w-3xl", rest.containerClassName)}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </Shell>
  );
}
