import type { FeatureId, FeatureState } from "./config";

/**
 * Interface for the core FeaturesRepository.
 * This interface defines methods for checking feature flags and team feature access.
 */
export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean>;
  getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]>;
  setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
  setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
  /**
   * Get user's feature states for multiple features.
   * @returns Record<featureId, 'enabled' | 'disabled' | 'inherit'>
   */
  getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>>;
  /**
   * Get multiple features' states across multiple teams.
   * Optimized for querying many teams for many features.
   * @returns Record<featureId, Record<teamId, 'enabled' | 'disabled' | 'inherit'>>
   */
  getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>>;
  /**
   * Get user's autoOptInFeatures flag.
   * @returns Promise<boolean> - True if user has auto opt-in enabled
   */
  getUserAutoOptIn(userId: number): Promise<boolean>;
  /**
   * Get autoOptInFeatures for multiple teams (batch).
   * @returns Promise<Record<number, boolean>> - Map of teamId to autoOptInFeatures value
   */
  getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>>;
  /**
   * Set user's autoOptInFeatures flag.
   */
  setUserAutoOptIn(userId: number, enabled: boolean): Promise<void>;
  /**
   * Set team's autoOptInFeatures flag.
   */
  setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
}
