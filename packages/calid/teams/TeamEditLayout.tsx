"use client";

// import ProfileSettingsView from "@calid/features/teams/ProfileSettingsView";
import type { HorizontalTabItemProps } from "@calid/features/ui";
import { HorizontalTabs } from "@calid/features/ui";
import React from "react";
// import { _generateMetadata, getTranslate } from "app/_utils";
import { useMemo } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

// export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
//   await _generateMetadata(
//     (t) => t("profile"),
//     (t) => t("profile_team_description"),
//     undefined,
//     undefined,
//     `/settings/teams/${(await params).id}/profile`
//   );

export const TeamEditLayout = ({ teamId, children }: { teamId: string; children: React.node }) => {
  const { t } = useLocale();

  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
    console.log("Edit team id: ", teamId);

    const baseTabConfigs = [
      {
        name: "profile",
        icon: "calendar",
        path: `/settings/teams/${teamId}/profile`,
        "data-testid": "profile",
      },
      {
        name: "members",
        path: `/settings/teams/${teamId}/members`,
        "data-testid": "members",
      },
      {
        name: "appearance",
        path: `/settings/teams/${teamId}/appearance`,
        "data-testid": "appearance",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      name: tabConfig.name,
      href: tabConfig.path,
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
