"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { TeamsCTA } from "app/(use-page-wrapper)/(main-nav)/teams/CTA";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const TeamsListSkeleton = () => {
  const { t } = useLocale();
  return (
    <ShellMainAppDir
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      CTA={<TeamsCTA />}>
      <SkeletonLoaderTeamList />
    </ShellMainAppDir>
  );
};
