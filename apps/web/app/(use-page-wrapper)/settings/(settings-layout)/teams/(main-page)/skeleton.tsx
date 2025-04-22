"use client";

import SkeletonList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const TeamsListSkeleton = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("teams")} description={t("create_manage_teams_collaborative")}>
      <SkeletonList />
    </SettingsHeader>
  );
};
