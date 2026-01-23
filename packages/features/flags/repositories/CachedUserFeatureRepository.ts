import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { UserFeaturesDto } from "@calcom/lib/dto/UserFeaturesDto";
import { UserFeaturesDtoSchema } from "@calcom/lib/dto/UserFeaturesDto";
import type { FeatureId } from "../config";
import type { IUserFeatureRepository } from "./PrismaUserFeatureRepository";
import { booleanSchema } from "./schemas";

const CACHE_PREFIX = "features:user";
const KEY = {
  byUserIdAndFeatureId: (userId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${userId}:${featureId}`,
  autoOptInByUserId: (userId: number): string => `${CACHE_PREFIX}:autoOptIn:${userId}`,
};

export class CachedUserFeatureRepository implements IUserFeatureRepository {
  constructor(private prismaUserFeatureRepository: IUserFeatureRepository) {}

  @Memoize({
    key: (userId: number, featureId: FeatureId) => KEY.byUserIdAndFeatureId(userId, featureId),
    schema: UserFeaturesDtoSchema,
  })
  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeaturesDto | null> {
    return this.prismaUserFeatureRepository.findByUserIdAndFeatureId(userId, featureId);
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeaturesDto>>> {
    const results = await Promise.all(
      featureIds.map(async (featureId) => {
        const userFeature = await this.findByUserIdAndFeatureId(userId, featureId);
        return { featureId, userFeature };
      })
    );

    const result: Partial<Record<FeatureId, UserFeaturesDto>> = {};
    for (const { featureId, userFeature } of results) {
      if (userFeature !== null) {
        result[featureId] = userFeature;
      }
    }

    return result;
  }

  @Unmemoize({
    keys: (userId: number, featureId: FeatureId) => [KEY.byUserIdAndFeatureId(userId, featureId)],
  })
  async upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeaturesDto> {
    return this.prismaUserFeatureRepository.upsert(userId, featureId, enabled, assignedBy);
  }

  @Unmemoize({
    keys: (userId: number, featureId: FeatureId) => [KEY.byUserIdAndFeatureId(userId, featureId)],
  })
  async delete(userId: number, featureId: FeatureId): Promise<void> {
    return this.prismaUserFeatureRepository.delete(userId, featureId);
  }

  @Memoize({
    key: (userId: number) => KEY.autoOptInByUserId(userId),
    schema: booleanSchema,
  })
  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    return this.prismaUserFeatureRepository.findAutoOptInByUserId(userId);
  }

  @Unmemoize({
    keys: (userId: number) => [KEY.autoOptInByUserId(userId)],
  })
  async setAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    return this.prismaUserFeatureRepository.setAutoOptIn(userId, enabled);
  }
}
