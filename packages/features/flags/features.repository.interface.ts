export interface IFeaturesRepository {
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
}
