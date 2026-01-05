import { trpc } from "@calcom/trpc/react";
import { useEffect, useMemo } from "react";

import { trackExperimentExposure } from "../lib/posthog-tracker";
import type { ExperimentAssignmentType } from "../types";

interface UseExperimentOptions {
  userId?: number;
  teamId?: number;
  skip?: boolean;
}

export interface UseExperimentResult {
  variant: string | null;
  isLoading: boolean;
  isError: boolean;
  isControl: boolean;
  isNewAssignment: boolean;
  experimentSlug: string;
  assignmentType: ExperimentAssignmentType | null;
}

export function useExperiment(
  experimentSlug: string,
  options: UseExperimentOptions = {}
): UseExperimentResult {
  const { userId, teamId, skip = false } = options;

  const { data, isLoading, isError } = trpc.viewer.experiments.getVariant.useQuery(
    {
      experimentSlug,
      userId,
      teamId,
    },
    {
      enabled: !skip && (!!userId || !!teamId),
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    }
  );

  useEffect(() => {
    if (data && !isLoading && !isError) {
      trackExperimentExposure({
        experiment_slug: experimentSlug,
        variant: data.variant,
        assignment_type: data.assignmentType,
        user_id: userId,
        team_id: teamId,
      });
    }
  }, [data, isLoading, isError, experimentSlug, userId, teamId]);

  return useMemo(
    () => ({
      variant: data?.variant || null,
      isLoading,
      isError,
      isControl: data?.variant === "control",
      isNewAssignment: data?.isNewAssignment || false,
      experimentSlug,
      assignmentType: data?.assignmentType || null,
    }),
    [data, isLoading, isError, experimentSlug]
  );
}
