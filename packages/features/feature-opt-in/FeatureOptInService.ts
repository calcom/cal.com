import type { AppFlags } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import type { IFeatureOptInRepository } from "./FeatureOptInRepositoryInterface";
import { OPT_IN_FEATURES } from "./config";
import type { FeatureState } from "./types";

/**
 * Converts a database row state to a FeatureState.
 * - Row exists with enabled=true → "enabled"
 * - Row exists with enabled=false → "disabled"
 * - No row → "inherit"
 */
function toFeatureState(row: { enabled: boolean } | null): FeatureState {
  if (row === null) return "inherit";
  return row.enabled ? "enabled" : "disabled";
}

function computeEffectiveState(globalEnabled: boolean, teamState: FeatureState, userState: FeatureState) {
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

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, team, and user settings.
 */
export class FeatureOptInService {
  constructor(
    private featureOptInRepository: IFeatureOptInRepository,
    private featuresRepository: FeaturesRepository
  ) {}

  /**
   * Get feature status for a user including effective state computation.
   *
   * Precedence rules:
   * - Global disabled → effectiveEnabled = false
   * - Team explicitly disabled (enabled=false) → effectiveEnabled = false
   * - User explicitly enabled → effectiveEnabled = true
   * - User inherits → use team state (enabled or inherit)
   */
  async getFeatureStatusForUser({
    userId,
    teamId,
    featureId,
  }: {
    userId: number;
    teamId: number | null;
    featureId: keyof AppFlags;
  }) {
    // Get global feature state (uses cached getAllFeatures from FeaturesRepository)
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalFeature = allFeatures.find((f) => f.slug === featureId);
    const globalEnabled = globalFeature?.enabled ?? false;

    // Get user state
    const userRow = await this.featureOptInRepository.getUserFeatureState({ userId, featureId });
    const userState = toFeatureState(userRow);

    // Get team state
    let teamRow: { enabled: boolean } | null = null;
    if (teamId !== null) {
      teamRow = await this.featureOptInRepository.getTeamFeatureState({ teamId, featureId });
    }
    const teamState = toFeatureState(teamRow);
    const effectiveEnabled = computeEffectiveState(globalEnabled, userState, teamState);

    return {
      globalEnabled,
      userState,
      teamState,
      effectiveEnabled,
    };
  }

  /**
   * List all opt-in features with their states for a user.
   * Only returns features that are in the allowlist.
   */
  async listFeaturesForUser(input: { userId: number; teamId: number | null }) {
    const { userId, teamId } = input;

    return (
      await Promise.all(
        OPT_IN_FEATURES.map((config) =>
          this.getFeatureStatusForUser({ userId, teamId, featureId: config.slug })
        )
      )
    ).filter((item) => item.globalEnabled);
  }

  /**
   * Get feature status for a team (without user-level override).
   */
  async getFeatureStatusForTeam(input: { teamId: number; featureId: keyof AppFlags }) {
    const { teamId, featureId } = input;

    // Get global feature state (uses cached getAllFeatures from FeaturesRepository)
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalFeature = allFeatures.find((f) => f.slug === featureId);
    const globalEnabled = globalFeature?.enabled ?? false;

    // Get team state
    const teamRow = await this.featureOptInRepository.getTeamFeatureState({ teamId, featureId });
    const teamState = toFeatureState(teamRow);

    return {
      globalEnabled,
      teamState,
    };
  }

  /**
   * List all opt-in features with their states for a team.
   * Only returns features that are in the allowlist.
   */
  async listFeaturesForTeam({ teamId }: { teamId: number }) {
    return (
      await Promise.all(
        OPT_IN_FEATURES.map((config) => this.getFeatureStatusForTeam({ teamId, featureId: config.slug }))
      )
    ).filter((item) => item.globalEnabled);
  }

  /**
   * Set user's feature state.
   */
  async setUserFeatureState(input: {
    userId: number;
    featureId: keyof AppFlags;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void> {
    await this.featureOptInRepository.setUserFeatureState(input);
  }

  /**
   * Set team's feature state.
   */
  async setTeamFeatureState(input: {
    teamId: number;
    featureId: keyof AppFlags;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void> {
    await this.featureOptInRepository.setTeamFeatureState(input);
  }
}
