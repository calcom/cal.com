import type { AppFlags, TeamFeatures } from "./config";

export interface IFeaturesRepository {
  getAllFeatures(): Promise<{ slug: string; enabled: boolean }[]>;
  getFeatureFlagMap(): Promise<AppFlags>;
  getTeamFeatures(teamId: number): Promise<TeamFeatures | null>;
  checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean>;
  getTeamsWithFeatureEnabled(slug: keyof AppFlags): Promise<number[]>;
  enableFeatureForTeam(teamId: number, featureId: keyof AppFlags, assignedBy: string): Promise<void>;
}
