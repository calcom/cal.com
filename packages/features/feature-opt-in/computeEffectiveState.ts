import type { FeatureState } from "./types";

/**
 * Computes the effective enabled state based on global, team, and user settings.
 *
 * Precedence rules:
 * - Global disabled → false
 * - Team explicitly disabled → false
 * - User explicitly enabled → true
 * - User explicitly disabled → false
 * - User inherits → use team state (true only if team is explicitly enabled)
 */
export function computeEffectiveState({
  globalEnabled,
  teamState,
  userState,
}: {
  globalEnabled: boolean;
  teamState: FeatureState;
  userState: FeatureState;
}): boolean {
  if (!globalEnabled || teamState === "disabled") {
    return false;
  }
  if (userState === "enabled") {
    return true;
  } else if (userState === "disabled") {
    return false;
  } else if (userState === "inherit") {
    return teamState === "enabled"; // enabled only if team is explicitly enabled
  }

  return false;
}
