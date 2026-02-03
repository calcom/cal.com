"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import SkeletonLoaderTeamList from "~/ee/teams/components/SkeletonloaderTeamList";

export function SkeletonLoader() {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("org_admin_other_teams")} description={t("org_admin_other_teams_description")}>
      <SkeletonLoaderTeamList />
    </SettingsHeader>
  );
}
