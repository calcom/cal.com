"use client";

import { TeamsListSkeletonLoader } from "@calid/features/modules/teams/components/TeamsListSkeletonLoader";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export const TeamsListSkeleton = () => {
  const { t } = useLocale();
  return (
    <ShellMainAppDir heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <TeamsListSkeletonLoader />
    </ShellMainAppDir>
  );
};
