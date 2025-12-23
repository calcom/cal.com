import type { FeatureState } from "@calcom/features/flags/config";

export type EffectiveStateReason =
  | "feature_global_disabled"
  | "feature_org_disabled"
  | "feature_all_teams_disabled"
  | "feature_user_disabled"
  | "feature_no_explicit_enablement"
  | "feature_enabled";

export type EffectiveStateResult = {
  enabled: boolean;
  reason: EffectiveStateReason;
};

/**
 * Computes the effective enabled state based on global, org, teams, and user settings.
 *
 * The logic follows these rules:
 * - Any level set to "disabled" blocks the feature (org blocks all, team blocks that team's users, user blocks self)
 * - User can explicitly opt-in to enable the feature for themselves
 * - "enabled" at org/team level provides enablement that users can inherit from
 * - "inherit" passes through to the level above
 *
 * Returns both the enabled state and the reason for that state.
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
}): EffectiveStateResult {
  // Derive all conditions upfront
  const orgEnabled = orgState === "enabled";
  const orgDisabled = orgState === "disabled";
  const anyTeamEnabled = teamStates.some((s) => s === "enabled");
  const allTeamsDisabled = teamStates.length > 0 && teamStates.every((s) => s === "disabled");
  const userEnabled = userState === "enabled";
  const userDisabled = userState === "disabled";

  // Explicit enablement exists above user level
  const hasExplicitEnablementAboveUser = orgEnabled || anyTeamEnabled;

  // Check conditions in order of precedence and return with reason
  if (!globalEnabled) {
    return { enabled: false, reason: "feature_global_disabled" };
  }

  if (orgDisabled) {
    return { enabled: false, reason: "feature_org_disabled" };
  }

  if (allTeamsDisabled) {
    return { enabled: false, reason: "feature_all_teams_disabled" };
  }

  if (userDisabled) {
    return { enabled: false, reason: "feature_user_disabled" };
  }

  if (!userEnabled && !hasExplicitEnablementAboveUser) {
    return { enabled: false, reason: "feature_no_explicit_enablement" };
  }

  return { enabled: true, reason: "feature_enabled" };
}
