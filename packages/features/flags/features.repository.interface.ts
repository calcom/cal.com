import type { AppFlags } from "./config";

export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean>;
}
