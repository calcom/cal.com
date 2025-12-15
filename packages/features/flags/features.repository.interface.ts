import type { FeatureId, FeatureState } from "./config";

/**
 * Interface for the core FeaturesRepository.
 * This interface defines methods for checking feature flags and team feature access.
 */
export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean>;
  getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]>;
  setUserFeatureState(
    userId: number,
    featureId: FeatureId,
    state: FeatureState,
    assignedBy: string
  ): Promise<void>;
  setTeamFeatureState(
    teamId: number,
    featureId: FeatureId,
    state: FeatureState,
    assignedBy: string
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
}
