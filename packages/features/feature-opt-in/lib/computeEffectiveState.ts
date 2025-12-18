import type { FeatureState } from "@calcom/features/flags/config";

/**
 * Computes the effective enabled state based on global, org, teams, and user settings.
 *
 * Key principle: "inherit" all the way up the chain results in the feature being disabled.
 * At least one level must explicitly enable the feature.
 *
 * The logic follows these rules:
 * - Any level set to "disabled" blocks the feature (org blocks all, team blocks that team's users, user blocks self)
 * - "enabled" at any level provides explicit enablement that lower levels can inherit from
 * - "inherit" passes through to the level above - if nothing above is "enabled", the feature is off
 */
export function computeEffectiveStateAcrossTeams({
  globalEnabled,
  orgState,
  teamStates,
  userState,
}: {
  globalEnabled: boolean;
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState;
}): boolean {
  // Derive all conditions upfront
  const orgEnabled = orgState === "enabled";
  const orgDisabled = orgState === "disabled";
  const anyTeamEnabled = teamStates.some((s) => s === "enabled");
  const anyTeamInherits = teamStates.some((s) => s === "inherit");
  const allTeamsDisabled = teamStates.length > 0 && teamStates.every((s) => s === "disabled");
  const userEnabled = userState === "enabled";
  const userDisabled = userState === "disabled";
  const hasTeams = teamStates.length > 0;

  // Team level allows if: no teams, or org enabled + team enabled/inherits, or team explicitly enabled
  const teamLevelAllows = !hasTeams || (orgEnabled && (anyTeamEnabled || anyTeamInherits)) || anyTeamEnabled;

  // Explicit enablement exists above user level
  const hasExplicitEnablementAboveUser = orgEnabled || anyTeamEnabled;

  // Define when feature is enabled (whitelist approach)
  const isEnabled =
    globalEnabled &&
    !userDisabled &&
    !orgDisabled &&
    !allTeamsDisabled &&
    teamLevelAllows &&
    (userEnabled
      ? !hasTeams || hasExplicitEnablementAboveUser // User enabled: needs org/team backing if teams exist
      : hasExplicitEnablementAboveUser); // User inherits: needs explicit enablement above

  return isEnabled;
}
