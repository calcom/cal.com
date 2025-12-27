import type { FeatureState } from "@calcom/features/flags/config";

/**
 * Computes the effective enabled state based on global, org, teams, and user settings.
 *
 * The logic follows these rules:
 * - Any level set to "disabled" blocks the feature (org blocks all, team blocks that team's users, user blocks self)
 * - User can explicitly opt-in to enable the feature for themselves
 * - "enabled" at org/team level provides enablement that users can inherit from
 * - "inherit" passes through to the level above
 */
export function computeEffectiveStateAcrossTeams({
  globalEnabled,
  orgState,
  teamStates,
  userState,
}: {
  /**
   * Acts as a global kill switch. When false, the feature is disabled for everyone.
   * When true, the feature is NOT necessarily enabled - enablement still depends on
   * the org, team, and user state hierarchy.
   */
  globalEnabled: boolean;
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState;
}): boolean {
  // Derive all conditions upfront
  const orgEnabled = orgState === "enabled";
  const orgDisabled = orgState === "disabled";
  const anyTeamEnabled = teamStates.some((s) => s === "enabled");
  const allTeamsDisabled = teamStates.length > 0 && teamStates.every((s) => s === "disabled");
  const userEnabled = userState === "enabled";
  const userDisabled = userState === "disabled";

  // Explicit enablement exists above user level
  const hasExplicitEnablementAboveUser = orgEnabled || anyTeamEnabled;

  // Define when feature is enabled (whitelist approach)
  const isEnabled =
    globalEnabled &&
    !userDisabled &&
    !orgDisabled &&
    !allTeamsDisabled &&
    (userEnabled || hasExplicitEnablementAboveUser); // User can opt-in directly, or inherit from org/team

  return isEnabled;
}
