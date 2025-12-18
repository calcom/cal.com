import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { AppFlags, FeatureState, TeamFeatures } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

interface CacheOptions {
  ttl: number; // time in ms
}

/**
 * Repository class for managing feature flags and feature access control.
 * Implements the IFeaturesRepository interface to provide feature flag functionality
 * for users, teams, and global application features.
 */
export class FeaturesRepository implements IFeaturesRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static featuresCache: { data: any[]; expiry: number } | null = null;

  constructor(private prismaClient: PrismaClient) {}

  private clearCache() {
    FeaturesRepository.featuresCache = null;
  }

  /**
   * Gets all features with their enabled status.
   * Uses caching to avoid hitting the database on every request.
   * @returns Promise<Feature[]> - Array of all features
   */
  public async getAllFeatures() {
    if (FeaturesRepository.featuresCache && Date.now() < FeaturesRepository.featuresCache.expiry) {
      return FeaturesRepository.featuresCache.data;
    }

    const features = await this.prismaClient.feature.findMany({
      orderBy: { slug: "asc" },
    });

    FeaturesRepository.featuresCache = {
      data: features,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes cache
    };

    return features;
  }

  /**
   * Gets a map of all feature flags and their enabled status.
   * Uses caching to avoid hitting the database on every request.
   * @returns Promise<AppFlags> - A map of feature flags to their enabled status
   */
  public async getFeatureFlagMap() {
    const flags = await this.getAllFeatures();
    return flags.reduce((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }

  /**
   * Gets all features enabled for a specific team in a map format.
   * @param teamId - The ID of the team to get features for
   * @returns Promise<{ [slug: string]: boolean } | null>
   */
  public async getEnabledTeamFeatures(teamId: number) {
    const result = await this.prismaClient.teamFeatures.findMany({
      where: {
        teamId,
        enabled: true,
      },
      select: {
        feature: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!result.length) return null;

    const features: TeamFeatures = Object.fromEntries(
      result.map((teamFeature) => [teamFeature.feature.slug, true])
    ) as TeamFeatures;

    return features;
  }

  /**
   * Checks if a feature is enabled globally in the application.
   * @param slug - The feature flag identifier to check
   * @returns Promise<boolean> - True if the feature is enabled globally, false otherwise
   * @throws Error if the feature flag check fails
   */
  async checkIfFeatureIsEnabledGlobally(
    slug: keyof AppFlags,
    _options: CacheOptions = { ttl: 5 * 60 * 1000 }
  ): Promise<boolean> {
    try {
      const features = await this.getAllFeatures();
      const flag = features.find((f) => f.slug === slug);
      return Boolean(flag && flag.enabled);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a specific user has access to a feature based on user and team assignments.
   * Uses tri-state semantics:
   * - Row with enabled=true → feature is enabled
   * - Row with enabled=false → feature is explicitly disabled (blocks inheritance)
   * - No row → inherit from team/org level
   *
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user has access to the feature, false otherwise
   * @throws Error if the feature access check fails
   */
  async checkIfUserHasFeature(userId: number, slug: string) {
    try {
      /**
       * findUnique was failing in prismock tests, so I'm using findFirst instead
       * FIXME refactor when upgrading prismock
       * https://github.com/morintd/prismock/issues/592
       */
      const userFeature = await this.prismaClient.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
        select: { enabled: true },
      });

      // If user has an explicit setting, use it
      if (userFeature) {
        return userFeature.enabled;
      }

      // If no user-level setting, check if they belong to a team with the feature.
      // This also covers organizations, which are teams.
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
   * Uses tri-state semantics:
   * - Row with enabled=true → feature is enabled
   * - Row with enabled=false → feature is explicitly disabled
   * - No row → inherit from direct team memberships
   *
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user has direct or same-level team access to the feature
   * @throws Error if the feature access check fails
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string) {
    try {
      // Prismock limitation: findUnique may fail, use findFirst instead
      const userFeature = await this.prismaClient.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
        select: { enabled: true },
      });

      // If user has an explicit setting, use it
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

  /**
   * Private helper method to check if a user belongs to any team that has access to a feature.
   * Uses tri-state semantics: only treats as enabled if TeamFeatures row exists AND enabled=true.
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user belongs to a team with the feature enabled, false otherwise
   * @throws Error if the team feature check fails
   * @private
   */
  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string) {
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

      const result = await this.prismaClient.$queryRaw<unknown[]>(query);
      return result.length > 0;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a user belongs to any direct team that has access to a feature.
   * This version ignores parent/child team relationships — no recursion or hierarchy traversal.
   * Uses tri-state semantics: only treats as enabled if TeamFeatures row exists AND enabled=true.
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user belongs to a team with the feature enabled (direct only)
   * @throws Error if the query fails
   * @private
   */
  private async checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string) {
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

      const result = await this.prismaClient.$queryRaw<unknown[]>(query);
      return result.length > 0;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Updates a feature status for a specific team.
   * Uses tri-state semantics: creates/updates a row with enabled=true.
   * @param teamId - The ID of the team to enable the feature for
   * @param featureId - The feature identifier to enable
   * @param state - 'enabled' | 'disabled' | 'inherit'
   * @param assignedBy - The user or what assigned the feature
   * @returns Promise<void>
   * @throws Error if the feature enabling fails
   */
  async setTeamFeatureState(
    teamId: number,
    featureId: keyof AppFlags,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    try {
      if (state === "enabled" || state === "disabled") {
        await this.prismaClient.teamFeatures.upsert({
          where: {
            teamId_featureId: {
              teamId,
              featureId,
            },
          },
          create: {
            teamId,
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
        await this.prismaClient.teamFeatures.deleteMany({
          where: {
            teamId,
            featureId,
          },
        });
      }
      // Clear cache when features are modified
      this.clearCache();
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a team or any of its ancestors has access to a specific feature.
   * Uses a recursive CTE raw SQL query for performance.
   * Uses tri-state semantics: only treats as enabled if TeamFeatures row exists AND enabled=true.
   *
   * @param teamId - The ID of the team to start the check from
   * @param featureId - The feature identifier to check
   * @returns Promise<boolean> - True if the team or any ancestor has the feature enabled, false otherwise
   * @throws Error if the database query fails
   */
  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    try {
      // Early return if team has feature directly assigned with enabled=true
      const teamFeature = await this.prismaClient.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
        select: { enabled: true },
      });
      if (teamFeature) return teamFeature.enabled;

      const query = Prisma.sql`
        WITH RECURSIVE TeamHierarchy AS (
          -- Start with the initial team
          SELECT id, "parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = id AND tf."featureId" = ${featureId} AND tf."enabled" = true
            ) THEN true ELSE false END as has_feature
          FROM "Team"
          WHERE id = ${teamId}

          UNION ALL

          -- Recursively get parent teams
          SELECT p.id, p."parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = p.id AND tf."featureId" = ${featureId} AND tf."enabled" = true
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

      const result = await this.prismaClient.$queryRaw<unknown[]>(query);
      return result.length > 0;
    } catch (err) {
      captureException(err);
      console.error(
        `Recursive feature check failed for team ${teamId}, feature ${featureId}:`,
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  }

  async getTeamsWithFeatureEnabled(slug: keyof AppFlags): Promise<number[]> {
    try {
      // If globally disabled, treat as effectively disabled everywhere
      const isGloballyEnabled = await this.checkIfFeatureIsEnabledGlobally(slug);
      if (!isGloballyEnabled) return [];

      // Only return teams where enabled=true (tri-state semantics)
      const rows = await this.prismaClient.teamFeatures.findMany({
        where: {
          featureId: slug,
          enabled: true,
        },
        select: { teamId: true },
        orderBy: { teamId: "asc" },
      });

      return rows.map((r) => r.teamId);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
