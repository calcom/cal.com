"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { TeamsCTA } from "app/(use-page-wrapper)/(main-nav)/teams/CTA";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import SkeletonLoaderTeamList from "~/ee/teams/components/SkeletonloaderTeamList";

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
