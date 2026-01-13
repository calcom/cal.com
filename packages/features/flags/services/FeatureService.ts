import type { IPrismaUserFeatureRepository } from "../repositories/PrismaUserFeatureRepository";
import type { IFeatureService } from "./IFeatureService";

export interface IFeatureServiceDeps {
  prismaUserFeatureRepo: IPrismaUserFeatureRepository;
}

/**
 * FeatureService orchestrates feature flag checks across different entities.
 * It contains the business logic for determining if a user has access to a feature,
 * including fallback logic to check team memberships.
 */
export class FeatureService implements IFeatureService {
  constructor(private deps: IFeatureServiceDeps) {}

  /**
   * Checks if a user has access to a feature.
   * First checks if the user has the feature directly assigned.
   * If not found, falls back to checking if the user belongs to a team
   * (or parent team in the hierarchy) that has the feature enabled.
   */
  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const userFeature = await this.deps.prismaUserFeatureRepo.findByUserIdAndFeatureId(userId, slug);

    if (userFeature) {
      return userFeature.enabled;
    }

    return this.deps.prismaUserFeatureRepo.checkIfUserBelongsToTeamWithFeature(userId, slug);
  }

  /**
   * Checks if a user has access to a feature without traversing the team hierarchy.
   * First checks if the user has the feature directly assigned.
   * If not found, falls back to checking if the user belongs to a team
   * (direct membership only, not parent teams) that has the feature enabled.
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const userFeature = await this.deps.prismaUserFeatureRepo.findByUserIdAndFeatureId(userId, slug);

    if (userFeature) {
      return userFeature.enabled;
    }

    return this.deps.prismaUserFeatureRepo.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, slug);
  }
}
