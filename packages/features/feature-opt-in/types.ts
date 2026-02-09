import type { EffectiveStateReason } from "@calcom/features/feature-opt-in/lib/computeEffectiveState";
import type { FeatureState } from "@calcom/features/flags/config";

/**
 * Policy that determines how feature opt-in states are evaluated.
 *
 * - `permissive`: User opt-in can activate the feature; any explicit enable above is sufficient;
 *   disables only win if ALL teams disable.
 * - `strict`: User opt-in alone is not enough; requires explicit enable from org/team;
 *   ANY explicit disable blocks.
 */
export type OptInFeaturePolicy = "permissive" | "strict";

/**
 * Scope that determines at which levels a feature can be configured.
 *
 * - `org`: Feature can be configured at the organization level
 * - `team`: Feature can be configured at the team level
 * - `user`: Feature can be configured at the user level
 */
export type OptInFeatureScope = "org" | "team" | "user";

/**
 * Normalized feature representation used across all scopes (user, team, org).
 */
export interface NormalizedFeature {
  slug: string;
  globalEnabled: boolean;
  /** The current state value for this scope (userState, teamState, etc.) */
  currentState: FeatureState;
  /** The reason for the effective state (only available for user scope) */
  effectiveReason?: EffectiveStateReason;
}

/**
 * Toggle option labels - differ between user and team/org scopes.
 */
export interface ToggleLabels {
  enabled: string;
  disabled: string;
  inherit: string;
}

/**
 * Common interface returned by all feature opt-in hooks.
 * This allows a single component to work with any scope.
 */
export interface UseFeatureOptInResult {
  // Query state
  features: NormalizedFeature[];
  autoOptIn: boolean;
  isLoading: boolean;

  // Mutations
  setFeatureState: (slug: string, state: FeatureState) => void;
  setAutoOptIn: (checked: boolean) => void;
  isStateMutationPending: boolean;
  isAutoOptInMutationPending: boolean;

  // Scope-specific configuration
  toggleLabels: ToggleLabels;

  /** Description for the auto opt-in toggle, varies by scope */
  autoOptInDescription: string;

  /**
   * For user scope: returns a warning message if the feature is blocked by org/team.
   * Returns null if not blocked or not applicable (team/org scopes).
   */
  getBlockedWarning: (feature: NormalizedFeature) => string | null;

  /**
   * Returns true if the feature toggle should be disabled because it's blocked by a higher level.
   * - User scope: blocked by org or all teams
   * - Team scope: blocked by org
   * - Org scope: never blocked (top level)
   */
  isBlockedByHigherLevel: (feature: NormalizedFeature) => boolean;
}
