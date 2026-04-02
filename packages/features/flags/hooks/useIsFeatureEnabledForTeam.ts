import { useMemo } from "react";
import type { AppFlags } from "../config";

export type TeamFeatures = Record<number, Record<keyof AppFlags, boolean>>;

export const useIsFeatureEnabledForTeam = ({
  teamFeatures,
  teamId,
  feature,
}: {
  teamFeatures?: TeamFeatures;
  teamId?: number;
  feature: keyof AppFlags;
}) => {
  return useMemo(() => {
    if (!teamId || !teamFeatures?.[teamId]) return false;
    return teamFeatures[teamId][feature];
  }, [teamFeatures, teamId, feature]);
};
