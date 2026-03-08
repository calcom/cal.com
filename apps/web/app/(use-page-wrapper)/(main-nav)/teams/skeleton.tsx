"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import SkeletonLoaderTeamList from "~/ee/teams/components/SkeletonloaderTeamList";

export const TeamsListSkeleton = () => {
  const { t } = useLocale();
  return (
    <ShellMainAppDir heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <SkeletonLoaderTeamList />
    </ShellMainAppDir>
  );
};
