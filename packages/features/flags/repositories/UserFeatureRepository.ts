import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { UserFeaturesDto } from "@calcom/lib/dto/UserFeaturesDto";
import { UserFeaturesDtoSchema } from "@calcom/lib/dto/UserFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "../config";
import { booleanSchema } from "./schemas";

const CACHE_PREFIX = "features:user";
const KEY = {
  byUserIdAndFeatureId: (userId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${userId}:${featureId}`,
  autoOptInByUserId: (userId: number): string => `${CACHE_PREFIX}:autoOptIn:${userId}`,
};

export interface IUserFeatureRepository {
  findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeaturesDto | null>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, UserFeaturesDto>>>;
  upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeaturesDto>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
  setAutoOptIn(userId: number, enabled: boolean): Promise<void>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>>;
  getUserFeatureStates(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>>;
  setState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
}

export class UserFeatureRepository implements IUserFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  @Memoize({
    key: (userId: number, featureId: FeatureId) => KEY.byUserIdAndFeatureId(userId, featureId),
    schema: UserFeaturesDtoSchema,
  })
  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeaturesDto | null> {
    const result = await this.prisma.userFeatures.findUnique({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
    });
    if (!result) return null;
    return this.toDto(result);
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
    const result = await this.prisma.userFeatures.upsert({
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
    return this.toDto(result);
  }

  private toDto(userFeature: {
    userId: number;
    featureId: string;
    enabled: boolean;
    assignedBy: string;
    updatedAt: Date;
  }): UserFeaturesDto {
    return {
      userId: userFeature.userId,
      featureId: userFeature.featureId,
      enabled: userFeature.enabled,
      assignedBy: userFeature.assignedBy,
      updatedAt: userFeature.updatedAt,
    };
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
  async setAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const userFeature = await this.findByUserIdAndFeatureId(userId, slug as FeatureId);

    if (userFeature) {
      return userFeature.enabled;
    }

    const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
    return userBelongsToTeamWithFeature;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const userFeature = await this.findByUserIdAndFeatureId(userId, slug as FeatureId);

    if (userFeature) {
      return userFeature.enabled;
    }

    const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
      userId,
      slug
    );

    return userBelongsToTeamWithFeature;
  }

  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    const query = Prisma.sql`
      WITH RECURSIVE TeamHierarchy AS (
        -- Start with teams the user belongs to
        SELECT DISTINCT t.id, t."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = t.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" t
        INNER JOIN "Membership" m ON m."teamId" = t.id
        WHERE m."userId" = ${userId} AND m.accepted = true

        UNION ALL

        -- Recursively get parent teams
        SELECT DISTINCT p.id, p."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = p.id AND tf."featureId" = ${slug} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" p
        INNER JOIN TeamHierarchy c ON p.id = c."parentId"
        WHERE NOT c.has_feature -- Stop recursion if we found a team with the feature
      )
      SELECT 1
      FROM TeamHierarchy
      WHERE has_feature = true
      LIMIT 1;
    `;

    const result = await this.prisma.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  private async checkIfUserBelongsToTeamWithFeatureNonHierarchical(
    userId: number,
    slug: string
  ): Promise<boolean> {
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

  async getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>> {
    if (slugs.length === 0) {
      return {};
    }

    const featuresStatus: Record<string, boolean> = Object.fromEntries(slugs.map((slug) => [slug, false]));

    const userFeatures = await this.prisma.userFeatures.findMany({
      where: {
        userId,
        featureId: {
          in: slugs,
        },
      },
      select: {
        featureId: true,
        enabled: true,
      },
    });

    const featuresConfiguredForUser = new Set<string>();
    const slugsToCheckAtTeamLevel: string[] = [];

    for (const userFeature of userFeatures) {
      featuresStatus[userFeature.featureId] = userFeature.enabled;
      featuresConfiguredForUser.add(userFeature.featureId);
    }

    for (const slug of slugs) {
      if (!featuresConfiguredForUser.has(slug)) {
        slugsToCheckAtTeamLevel.push(slug);
      }
    }

    await Promise.all(
      slugsToCheckAtTeamLevel.map(async (slug) => {
        const hasTeamFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
        featuresStatus[slug] = hasTeamFeature;
      })
    );

    return featuresStatus;
  }

  async getUserFeatureStates(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>> {
    const result: Partial<Record<FeatureId, FeatureState>> = {};
    for (const featureId of featureIds) {
      result[featureId] = "inherit";
    }

    const userFeatures = await this.prisma.userFeatures.findMany({
      where: {
        userId,
        featureId: { in: featureIds },
      },
      select: { featureId: true, enabled: true },
    });

    for (const userFeature of userFeatures) {
      result[userFeature.featureId as FeatureId] = userFeature.enabled ? "enabled" : "disabled";
    }

    return result;
  }

  @Unmemoize({
    keys: (input: { userId: number; featureId: FeatureId }) => [
      KEY.byUserIdAndFeatureId(input.userId, input.featureId),
    ],
  })
  async setState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { userId, featureId, state } = input;

    if (state === "enabled" || state === "disabled") {
      const { assignedBy } = input;
      await this.prisma.userFeatures.upsert({
        where: {
          userId_featureId: {
            userId,
            featureId,
          },
        },
        create: {
          userId,
          featureId,
          enabled: state === "enabled",
          assignedBy,
        },
        update: {
          enabled: state === "enabled",
          assignedBy,
        },
      });
    } else if (state === "inherit") {
      await this.prisma.userFeatures.deleteMany({
        where: {
          userId,
          featureId,
        },
      });
    }
  }
}
