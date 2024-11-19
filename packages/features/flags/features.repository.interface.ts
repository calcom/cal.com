import type { AppFlags } from "./config";

export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: string): Promise<boolean>;
  checkIfTeamOrUserHasFeature(args: { teamId?: number; userId?: number }, slug: string): Promise<boolean>;
}
