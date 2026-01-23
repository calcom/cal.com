import type { FeatureState } from "@calcom/features/flags/config";

/**
 * Applies auto-opt-in transformation to feature states.
 *
 * If a level has autoOptIn enabled AND the state is "inherit", the state is transformed to "enabled".
 * This allows entities to automatically opt into new features without explicit configuration.
 */
export function applyAutoOptIn({
  orgState,
  teamStates,
  userState,
  orgAutoOptIn,
  teamAutoOptIns,
  userAutoOptIn,
}: {
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState;
  orgAutoOptIn: boolean;
  teamAutoOptIns: boolean[];
  userAutoOptIn: boolean;
}): {
  effectiveOrgState: FeatureState;
  effectiveTeamStates: FeatureState[];
  effectiveUserState: FeatureState;
} {
  const effectiveOrgState: FeatureState = orgState === "inherit" && orgAutoOptIn ? "enabled" : orgState;

  const effectiveTeamStates: FeatureState[] = teamStates.map((state, index) => {
    const autoOptIn = teamAutoOptIns[index];
    return state === "inherit" && autoOptIn ? "enabled" : state;
  });

  const effectiveUserState: FeatureState = userState === "inherit" && userAutoOptIn ? "enabled" : userState;

  return {
    effectiveOrgState,
    effectiveTeamStates,
    effectiveUserState,
  };
}
