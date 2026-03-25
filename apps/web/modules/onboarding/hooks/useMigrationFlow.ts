"use client";

import { useSearchParams } from "next/navigation";
import { trpc } from "@calcom/trpc/react";

export const useMigrationFlow = () => {
  const searchParams = useSearchParams();
  const migrateParam = searchParams?.get("migrate");
  const isMigrationFlow = migrateParam === "true";

  const { data: teams, isLoading } = trpc.viewer.teams.listOwnedTeams.useQuery(undefined, {
    enabled: isMigrationFlow, // Only fetch if migration flow
  });

  const hasTeams = (teams?.length ?? 0) > 0;

  return {
    isMigrationFlow,
    hasTeams,
    teams: teams ?? [],
    isLoading,
  };
};
