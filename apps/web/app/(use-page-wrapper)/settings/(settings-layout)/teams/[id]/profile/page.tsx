"use client";

import ProfileSettingsView from "@calid/features/teams/ProfileSettingsView";
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

const Page = ({ params }: { params: { id: string } }) => {
  const { t } = useLocale();
  

  const resolvedParams = React.use(params);
  const teamId = resolvedParams.id;

  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
    console.log("Team id: ", teamId);

    const baseTabConfigs = [
      {
        name: "profile",
        path: `settings/teams/${teamId}/profile`,
        "data-testid": "profile",
      },
      {
        name: "Appearence",
        path: `settings/teams/${teamId}/appearence`,
        "data-testid": "appearence",
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
      title={t("profile")}
      description={t("profile_team_description")}
      borderInShellHeader={false}>
      <HorizontalTabs
        tabs={tabs.map((tab) => ({
          ...tab,
          name: t(tab.name),
        }))}
      />
      <ProfileSettingsView teamId={teamId} />
    </SettingsHeader>
  );
};

export default Page;
