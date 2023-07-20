"use client";

import type { getTeams, getCurrentOrg } from "app/(settings)/settings/fetchers";

import { classNames } from "@calcom/lib";
import type { IdentityProvider } from "@calcom/prisma/enums";

import { BackButtonInSidebar } from "@components/settings/sidebar/BackButtonInSidebar";
import { SidebarNavigationGroup } from "@components/settings/sidebar/SidebarNavigationGroup";

interface SettingsSidebarContainerProps {
  className?: string;
  navigationIsOpenedOnMobile?: boolean;
  identityProvider: IdentityProvider;
  teams: Awaited<ReturnType<typeof getTeams>>;
  currentOrg: Awaited<ReturnType<typeof getCurrentOrg>>;
}

export const SettingsSidebarContainer = ({
  className = "",
  navigationIsOpenedOnMobile,
  identityProvider,
  teams,
  currentOrg,
}: SettingsSidebarContainerProps) => {
  return (
    <nav
      className={classNames(
        "no-scrollbar bg-muted fixed bottom-0 left-0 top-0 z-20 flex max-h-screen w-56 flex-col space-y-1 overflow-x-hidden overflow-y-scroll px-2 pb-3 transition-transform max-lg:z-10 lg:sticky lg:flex",
        className,
        navigationIsOpenedOnMobile
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
      )}
      aria-label="Tabs">
      <>
        <BackButtonInSidebar name="back" />
        <SidebarNavigationGroup identityProvider={identityProvider} teams={teams} />
      </>
    </nav>
  );
};
