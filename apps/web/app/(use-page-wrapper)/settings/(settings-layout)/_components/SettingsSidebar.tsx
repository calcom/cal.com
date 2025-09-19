"use client";

import Link from "next/link";
import React from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { VerticalTabItem } from "@calcom/ui/components/navigation";
import { Skeleton } from "@calcom/ui/components/skeleton";

import { useSettingsStore } from "../../_lib/stores/settings-store";
import type { ProcessedTab } from "../../_lib/tabs/types";
import TeamCollapsible from "./TeamCollapsible";

interface SettingsSidebarProps {
  sideContainerOpen: boolean;
  setSideContainerOpen: (open: boolean) => void;
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
  bannersHeight?: number;
}

const BackButton = () => {
  const { t } = useLocale();
  return (
    <Link
      href="/event-types"
      className="hover:bg-subtle todesktop:mt-10 [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-emphasis group my-6 flex h-6 max-h-6 w-full flex-row items-center rounded-md px-3 py-2 text-sm font-medium leading-4 transition"
      data-testid="back-button">
      <Icon
        name="arrow-left"
        className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] rtl:rotate-180 md:mt-0"
      />
      <Skeleton title={t("back")} as="p" className="min-h-4 max-w-36 truncate" loadingClassName="ms-3">
        {t("back")}
      </Skeleton>
    </Link>
  );
};

const TabSection = ({
  tab,
  user,
  organization,
}: {
  tab: ProcessedTab;
  user?: SettingsSidebarProps["user"];
  organization?: SettingsSidebarProps["organization"];
}) => {
  const { t } = useLocale();
  const permissionContext = useSettingsStore((state) => state.permissionContext);
  const isOrgAdminOrOwner = permissionContext?.isOrgAdmin || permissionContext?.isOrgOwner;

  // Handle dynamic tabs (teams, other_teams)
  if (tab.key === "teams") {
    return <TeamCollapsible type="teams" isOrgAdmin={isOrgAdminOrOwner} />;
  }

  if (tab.key === "other_teams") {
    return <TeamCollapsible type="other_teams" />;
  }

  // Get display name and avatar
  let displayName = t(tab.name);
  let avatarUrl = tab.avatar;

  if (tab.key === "my_account" && user) {
    displayName = user.name || t("my_account");
    avatarUrl = getUserAvatarUrl(user);
  } else if (tab.key === "organization" && organization) {
    displayName = organization.name;
    avatarUrl = getPlaceholderAvatar(organization.logoUrl, organization.name);
  }

  return (
    <React.Fragment key={tab.key}>
      <div className={`${!tab.children?.length ? "!mb-3" : ""}`}>
        <div className="[&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default group flex h-7 w-full flex-row items-center rounded-md px-2 text-sm font-medium leading-none">
          {tab.icon && (
            <Icon
              name={tab.icon as any}
              className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
            />
          )}
          {!tab.icon && avatarUrl && (
            <img className="h-4 w-4 rounded-full ltr:mr-3 rtl:ml-3" src={avatarUrl} alt={displayName} />
          )}
          <Skeleton
            title={displayName}
            as="p"
            className="text-subtle truncate text-sm font-medium leading-5"
            loadingClassName="ms-3">
            {displayName}
          </Skeleton>
        </div>
      </div>
      {tab.children && tab.children.length > 0 && (
        <div className="my-3 space-y-px">
          {tab.children.map((child, index) => (
            <VerticalTabItem
              key={child.key}
              name={t(child.name)}
              isExternalLink={child.isExternalLink}
              href={child.href}
              textClassNames="text-emphasis font-medium text-sm"
              className={`me-5 h-7 w-auto !px-2 ${
                tab.children && index === tab.children.length - 1 && "!mb-3"
              }`}
              disableChevron
            />
          ))}
        </div>
      )}
    </React.Fragment>
  );
};

export default function SettingsSidebar({
  sideContainerOpen,
  setSideContainerOpen,
  user,
  organization,
  bannersHeight = 0,
}: SettingsSidebarProps) {
  const { t } = useLocale();
  const tabs = useSettingsStore((state) => state.getVisibleTabs());

  return (
    <>
      {/* Mobile backdrop */}
      {sideContainerOpen && (
        <button
          onClick={() => setSideContainerOpen(false)}
          className="fixed left-0 top-0 z-10 h-full w-full bg-black/50">
          <span className="sr-only">{t("hide_navigation")}</span>
        </button>
      )}
      {/* Sidebar */}
      <nav
        style={{ maxHeight: `calc(100vh - ${bannersHeight}px)`, top: `${bannersHeight}px` }}
        className={classNames(
          "no-scrollbar bg-muted fixed bottom-0 left-0 top-0 z-20 flex max-h-screen w-56 flex-col space-y-1 overflow-x-hidden overflow-y-scroll px-2 pb-3 transition-transform max-lg:z-10 lg:sticky lg:flex",
          sideContainerOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
        )}
        aria-label={t("settings_navigation")}>
        <BackButton />
        {tabs.map((tab) => (
          <TabSection key={tab.key} tab={tab} user={user} organization={organization} />
        ))}
        {/* Add new team button */}
        {tabs.find((t) => t.key === "teams") &&
          (!organization ||
            useSettingsStore.getState().permissionContext?.isOrgAdmin ||
            useSettingsStore.getState().permissionContext?.isOrgOwner) && (
            <VerticalTabItem
              name={t("add_a_team")}
              href={`${WEBAPP_URL}/settings/teams/new`}
              textClassNames="px-3 items-center mt-2 text-emphasis font-medium text-sm"
              icon="plus"
              disableChevron
            />
          )}
      </nav>
    </>
  );
}
