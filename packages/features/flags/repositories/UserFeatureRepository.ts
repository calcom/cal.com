import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { PrismaClient, UserFeatures } from "@calcom/prisma/client";
import type { FeatureId } from "../config";
import { booleanSchema, userFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:user";
const KEY = {
  byUserIdAndFeatureId: (userId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${userId}:${featureId}`,
  autoOptInByUserId: (userId: number): string => `${CACHE_PREFIX}:autoOptIn:${userId}`,
};

export interface IUserFeatureRepository {
  findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeatures | null>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeatures>>>;
  upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
}

export class UserFeatureRepository implements IUserFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  @Memoize({
    key: (userId: number, featureId: FeatureId) => KEY.byUserIdAndFeatureId(userId, featureId),
    schema: userFeaturesSchema,
  })
  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeatures | null> {
    return this.prisma.userFeatures.findUnique({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
    });
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeatures>>> {
    const results = await Promise.all(
      featureIds.map(async (featureId) => {
        const userFeature = await this.findByUserIdAndFeatureId(userId, featureId);
        return { featureId, userFeature };
      })
    );

    const result: Partial<Record<FeatureId, UserFeatures>> = {};
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
  ): Promise<UserFeatures> {
    return this.prisma.userFeatures.upsert({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
      create: {
        userId,
        featureId,
        enabled,
        assignedBy,
      },
      update: {
        enabled,
        assignedBy,
      },
    });
  }

  @Unmemoize({
    keys: (userId: number, featureId: FeatureId) => [KEY.byUserIdAndFeatureId(userId, featureId)],
  })
  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.prisma.userFeatures.delete({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
    });
  }

  @Memoize({
    key: (userId: number) => KEY.autoOptInByUserId(userId),
    schema: booleanSchema,
  })
  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoOptInFeatures: true },
    });
    return user?.autoOptInFeatures ?? false;
  }
}
