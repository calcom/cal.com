import type { AppFlags } from "../config";

type TeamFeatures = Record<number, Record<keyof AppFlags, boolean>> | null;

export const useIsFeatureEnabledForTeam = ({
  teamFeatures,
  teamId,
  feature,
}: {
  teamFeatures?: TeamFeatures;
  teamId?: number;
  feature: keyof AppFlags;
}) => {
  if (!teamId || !teamFeatures?.[teamId]) return false;
  return teamFeatures[teamId][feature];
};
