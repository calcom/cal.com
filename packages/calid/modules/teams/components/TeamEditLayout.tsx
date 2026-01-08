"use client";

import type { IconName } from "@calid/features/ui/components/icon/Icon";
import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabs } from "@calid/features/ui/components/navigation";
import type { ReactNode } from "react";
import React from "react";
import { useMemo } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

export const TeamEditLayout = ({ teamId, children }: { teamId: number; children: ReactNode }) => {
  const { t } = useLocale();

  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
    const baseTabConfigs = [
      {
        name: "profile",
        icon: "square-chart-gantt",
        path: `/settings/teams/${teamId}/profile`,
        "data-testid": "profile",
      },
      {
        name: "members",
        icon: "users",
        path: `/settings/teams/${teamId}/members`,
        "data-testid": "members",
      },
      {
        name: "appearance",
        icon: "monitor",
        path: `/settings/teams/${teamId}/appearance`,
        "data-testid": "appearance",
      },
      {
        name: "settings",
        icon: "settings",
        path: `/settings/teams/${teamId}/settings`,
        "data-testid": "settings",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      name: tabConfig.name,
      href: tabConfig.path,
      icon: tabConfig.icon as IconName,
      "data-testid": tabConfig["data-testid"],
    }));
  }, []);

  return (
    <SettingsHeader
      title={t("edit_teams")}
      description={t("edit_teams_description")}
      borderInShellHeader={false}>
      <HorizontalTabs
        tabs={tabs.map((tab) => ({
          ...tab,
          name: t(tab.name),
        }))}
      />
      {children}
    </SettingsHeader>
  );
};
