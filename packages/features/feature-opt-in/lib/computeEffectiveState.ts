import type { FeatureState } from "@calcom/features/flags/config";

import type { OptInFeaturePolicy } from "../types";

export type EffectiveStateReason =
  | "feature_global_disabled"
  | "feature_org_disabled"
  | "feature_all_teams_disabled"
  | "feature_any_team_disabled"
  | "feature_user_disabled"
  | "feature_no_explicit_enablement"
  | "feature_user_only_not_allowed"
  | "feature_enabled";

export type EffectiveStateResult = {
  enabled: boolean;
  reason: EffectiveStateReason;
};

/**
 * Computes the effective enabled state based on global, org, teams, and user settings.
 *
 * The logic depends on the policy:
 *
 * **Permissive policy (default):**
 * - User opt-in can activate the feature
 * - Any explicit enable above is sufficient
 * - Disables only win if ALL teams disable
 *
 * **Strict policy:**
 * - User opt-in alone is NOT enough - requires explicit enable from org/team
 * - ANY explicit disable blocks
 *
 * Returns both the enabled state and the reason for that state.
 */
export function computeEffectiveStateAcrossTeams({
  globalEnabled,
  orgState,
  teamStates,
  userState,
  policy,
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
  /**
   * Policy that determines how feature opt-in states are evaluated.
   */
  policy: OptInFeaturePolicy;
}): EffectiveStateResult {
  // Derive all conditions upfront
  const orgEnabled = orgState === "enabled";
  const orgDisabled = orgState === "disabled";
  const anyTeamEnabled = teamStates.some((s) => s === "enabled");
  const anyTeamDisabled = teamStates.some((s) => s === "disabled");
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

  if (policy === "strict") {
    // Strict policy: ANY explicit disable blocks
    if (anyTeamDisabled) {
      return { enabled: false, reason: "feature_any_team_disabled" };
    }

    // Strict policy: User opt-in alone is NOT enough - requires explicit enable from org/team
    if (userEnabled && !hasExplicitEnablementAboveUser) {
      return { enabled: false, reason: "feature_user_only_not_allowed" };
    }

    if (userDisabled) {
      return { enabled: false, reason: "feature_user_disabled" };
    }

    if (!hasExplicitEnablementAboveUser) {
      return { enabled: false, reason: "feature_no_explicit_enablement" };
    }

    return { enabled: true, reason: "feature_enabled" };
  }

  // Permissive policy (default): disables only win if ALL teams disable
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
