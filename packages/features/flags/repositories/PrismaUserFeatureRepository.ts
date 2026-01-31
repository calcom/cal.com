import type { UserFeaturesDto } from "@calcom/lib/dto/UserFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { captureException } from "@sentry/nextjs";
import type { FeatureId } from "../config";

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
}

export class PrismaUserFeatureRepository implements IUserFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

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
    if (featureIds.length === 0) {
      return {};
    }

    const results = await this.prisma.userFeatures.findMany({
      where: {
        userId,
        featureId: {
          in: featureIds,
        },
      },
      select: {
        userId: true,
        featureId: true,
        enabled: true,
        assignedBy: true,
        updatedAt: true,
      },
    });

    const result: Partial<Record<FeatureId, UserFeaturesDto>> = {};
    for (const userFeature of results) {
      result[userFeature.featureId as FeatureId] = this.toDto(userFeature);
    }

    return result;
  }

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

  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoOptInFeatures: true },
    });
    return user?.autoOptInFeatures ?? false;
  }

  async setAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }

  /**
   * Checks if a specific user has access to a feature based on user and team assignments.
   * Uses tri-state semantics:
   * - Row with enabled=true → feature is enabled
   * - Row with enabled=false → feature is explicitly disabled (blocks inheritance)
   * - No row → inherit from team/org level
   */
  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    try {
      const userFeature = await this.prisma.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
        select: { enabled: true },
      });

      if (userFeature) {
        return userFeature.enabled;
      }

      const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
      return userBelongsToTeamWithFeature;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a specific user has access to a feature, ignoring hierarchical (parent) teams.
   * Only checks direct user assignments and direct team memberships — does not traverse parents.
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    try {
      const userFeature = await this.prisma.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
        select: { enabled: true },
      });

      if (userFeature) {
        return userFeature.enabled;
      }

      const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        userId,
        slug
      );

      return userBelongsToTeamWithFeature;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    try {
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
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  private async checkIfUserBelongsToTeamWithFeatureNonHierarchical(
    userId: number,
    slug: string
  ): Promise<boolean> {
    try {
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
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
