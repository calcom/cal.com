import type { AppFlags } from "./config";

/**
 * Interface for the core FeaturesRepository.
 * This interface defines methods for checking feature flags and team feature access.
 *
 * Note: For feature opt-in specific operations (setting user/team features, auto opt-in),
 * see IFeatureOptInRepository in the feature-opt-in package.
 */
export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean>;
  getTeamsWithFeatureEnabled(slug: keyof AppFlags): Promise<number[]>;
  enableFeatureForTeam(teamId: number, featureId: keyof AppFlags, assignedBy: string): Promise<void>;
}
