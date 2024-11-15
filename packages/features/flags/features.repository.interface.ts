export interface IFeaturesRepository {
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: string): Promise<boolean>;
  checkIfTeamOrUserHasFeature(args: { teamId?: number; userId?: number }, slug: string): Promise<boolean>;
}
