"use client";

import { trpc } from "@calcom/trpc/react";
import { useSearchParams } from "next/navigation";

export const useMigrationFlow = () => {
  const searchParams = useSearchParams();
  const migrateParam = searchParams?.get("migrate");
  const isMigrationFlow = migrateParam === "true";

  const teams = { data: [] as unknown[] };
  const isLoading = false;

  const hasTeams = (teams?.data?.length ?? 0) > 0;

  return {
    isMigrationFlow,
    hasTeams,
    teams: teams ?? [],
    isLoading,
  };
};
