import type { PrismaClient, UserFeatures } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import { Memoize, Unmemoize } from "../../cache/decorators";
import type { IRedisService } from "../../redis/IRedisService.d";
import type { FeatureId } from "../config";
import { booleanSchema, userFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:user";
const KEY = {
  byUserIdAndFeatureId: (userId: number, featureId: string): string => `${CACHE_PREFIX}:${userId}:${featureId}`,
  autoOptInByUserId: (userId: number): string => `${CACHE_PREFIX}:autoOptIn:${userId}`,
};

export interface IUserFeatureRepositoryDeps {
  prisma: PrismaClient;
  redis: IRedisService;
}

export interface IUserFeatureRepository {
  findByUserId(userId: number): Promise<UserFeatures[]>;
  findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeatures | null>;
  findByUserIdAndFeatureIds(userId: number, featureIds: FeatureId[]): Promise<Partial<Record<FeatureId, UserFeatures>>>;
  checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
  updateAutoOptIn(userId: number, enabled: boolean): Promise<void>;
}

export class UserFeatureRepository implements IUserFeatureRepository {
  private prisma: PrismaClient;
  redis: IRedisService;

  constructor(deps: IUserFeatureRepositoryDeps) {
    this.prisma = deps.prisma;
    this.redis = deps.redis;
  }

  async findByUserId(userId: number): Promise<UserFeatures[]> {
    return this.prisma.userFeatures.findMany({
      where: { userId },
    });
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
    const result: Partial<Record<FeatureId, UserFeatures>> = {};
    const cacheMisses: FeatureId[] = [];

    const cachedResults = await Promise.all(
      featureIds.map(async (featureId) => {
        const cacheKey = KEY.byUserIdAndFeatureId(userId, featureId);
        const cached = await this.redis.get<unknown>(cacheKey);

        if (cached !== null) {
          const parsed = userFeaturesSchema.safeParse(cached);
          if (parsed.success) {
            return { featureId, cached: parsed.data };
          }
        }
        return { featureId, cached: null };
      })
    );

    for (const { featureId, cached } of cachedResults) {
      if (cached !== null) {
        result[featureId] = cached;
      } else {
        cacheMisses.push(featureId);
      }
    }

    if (cacheMisses.length > 0) {
      const dbResults = await this.prisma.userFeatures.findMany({
        where: {
          userId,
          featureId: { in: cacheMisses },
        },
      });

      const dbResultsMap = new Map(dbResults.map((uf) => [uf.featureId as FeatureId, uf]));

      await Promise.all(
        cacheMisses.map(async (featureId) => {
          const userFeature = dbResultsMap.get(featureId);
          if (userFeature) {
            result[featureId] = userFeature;
            const cacheKey = KEY.byUserIdAndFeatureId(userId, featureId);
            await this.redis.set(cacheKey, userFeature, { ttl: 5 * 60 * 1000 });
          }
        })
      );
    }

    return result;
  }

  async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    const query = Prisma.sql`
      WITH RECURSIVE TeamHierarchy AS (
        SELECT DISTINCT t.id, t."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = t.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" t
        INNER JOIN "Membership" m ON m."teamId" = t.id
        WHERE m."userId" = ${userId} AND m.accepted = true

        UNION ALL

        SELECT DISTINCT p.id, p."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = p.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" p
        INNER JOIN TeamHierarchy c ON p.id = c."parentId"
        WHERE NOT c.has_feature
      )
      SELECT 1
      FROM TeamHierarchy
      WHERE has_feature = true
      LIMIT 1;
    `;

    const result = await this.prisma.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  async checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const query = Prisma.sql`
      SELECT 1
      FROM "Team" t
      INNER JOIN "Membership" m ON m."teamId" = t.id
      WHERE m."userId" = ${userId}
        AND m.accepted = true
        AND EXISTS (
          SELECT 1
          FROM "TeamFeatures" tf
          WHERE tf."teamId" = t.id
            AND tf."featureId" = ${slug}
            AND tf."enabled" = true
        )
      LIMIT 1;
    `;

    const result = await this.prisma.$queryRaw<unknown[]>(query);
    return result.length > 0;
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

  @Unmemoize({
    keys: (userId: number) => [KEY.autoOptInByUserId(userId)],
  })
  async updateAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
