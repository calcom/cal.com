import type { IPrismaUserFeatureRepository } from "../repositories/PrismaUserFeatureRepository";
import type { IRedisUserFeatureRepository } from "../repositories/RedisUserFeatureRepository";
import type { IFeatureService } from "./FeatureService";

export interface ICachedFeatureServiceDeps {
  prismaUserFeatureRepo: IPrismaUserFeatureRepository;
  redisUserFeatureRepo: IRedisUserFeatureRepository;
}

export class CachedFeatureService implements IFeatureService {
  constructor(private deps: ICachedFeatureServiceDeps) {}

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cached = await this.deps.redisUserFeatureRepo.findByUserIdAndFeatureId(userId, slug);
    if (cached !== null) {
      return cached;
    }

    const userFeature = await this.deps.prismaUserFeatureRepo.findByUserIdAndFeatureId(userId, slug);

    if (userFeature) {
      await this.deps.redisUserFeatureRepo.setByUserIdAndFeatureId(userId, slug, userFeature.enabled);
      return userFeature.enabled;
    }

    const hasTeamFeature = await this.deps.prismaUserFeatureRepo.checkIfUserBelongsToTeamWithFeature(
      userId,
      slug
    );
    await this.deps.redisUserFeatureRepo.setByUserIdAndFeatureId(userId, slug, hasTeamFeature);
    return hasTeamFeature;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const cacheKey = `${slug}:nonHierarchical`;
    const cached = await this.deps.redisUserFeatureRepo.findByUserIdAndFeatureId(userId, cacheKey);
    if (cached !== null) {
      return cached;
    }

    const userFeature = await this.deps.prismaUserFeatureRepo.findByUserIdAndFeatureId(userId, slug);

    if (userFeature) {
      await this.deps.redisUserFeatureRepo.setByUserIdAndFeatureId(userId, cacheKey, userFeature.enabled);
      return userFeature.enabled;
    }

    const hasTeamFeature =
      await this.deps.prismaUserFeatureRepo.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, slug);
    await this.deps.redisUserFeatureRepo.setByUserIdAndFeatureId(userId, cacheKey, hasTeamFeature);
    return hasTeamFeature;
  }
}
