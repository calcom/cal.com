import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import { isTeamInRollout, isUserInRollout } from "./ab-testing";
import type { AppFlags, TeamFeatures } from "./config";
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
  public async getTeamFeatures(teamId: number) {
    const result = await this.prismaClient.teamFeatures.findMany({
      where: {
        teamId,
      },
      include: {
        feature: {
          select: {
            slug: true,
            enabled: true,
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
   * Checks if a specific user has access to a feature.
   * Checks both direct user feature assignments and team-based feature access.
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
      const userHasFeature = await this.prismaClient.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
      });
      if (userHasFeature) return true;
      // If the user doesn't have the feature, check if they belong to a team with the feature.
      // This also covers organizations, which are teams.
      const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
      if (userBelongsToTeamWithFeature) return true;
      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Private helper method to check if a user belongs to any team that has access to a feature.
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user belongs to a team with the feature, false otherwise
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
              WHERE tf."teamId" = t.id AND tf."featureId" = ${slug}
            ) THEN true ELSE false END as has_feature
          FROM "Team" t
          INNER JOIN "Membership" m ON m."teamId" = t.id
          WHERE m."userId" = ${userId} AND m.accepted = true

          UNION ALL

          -- Recursively get parent teams
          SELECT DISTINCT p.id, p."parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = p.id AND tf."featureId" = ${slug}
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
   * Enables a feature for a specific team.
   * @param teamId - The ID of the team to enable the feature for
   * @param featureId - The feature identifier to enable
   * @param assignedBy - The user or what assigned the feature
   * @returns Promise<void>
   * @throws Error if the feature enabling fails
   */
  async enableFeatureForTeam(teamId: number, featureId: keyof AppFlags, assignedBy: string): Promise<void> {
    try {
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
          assignedBy,
        },
        update: {},
      });
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
   * @param teamId - The ID of the team to start the check from
   * @param featureId - The feature identifier to check
   * @returns Promise<boolean> - True if the team or any ancestor has the feature, false otherwise
   * @throws Error if the database query fails
   */
  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    try {
      // Early return if team has feature directly assigned
      const teamHasFeature = await this.prismaClient.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
      });
      if (teamHasFeature) return true;

      const query = Prisma.sql`
        WITH RECURSIVE TeamHierarchy AS (
          -- Start with the initial team
          SELECT id, "parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = id AND tf."featureId" = ${featureId}
            ) THEN true ELSE false END as has_feature
          FROM "Team"
          WHERE id = ${teamId}

          UNION ALL

          -- Recursively get parent teams
          SELECT p.id, p."parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = p.id AND tf."featureId" = ${featureId}
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

  async checkIfUserIsInFeatureRollout(userId: number, slug: keyof AppFlags): Promise<boolean> {
    try {
      const features = await this.getAllFeatures();
      const feature = features.find((f) => f.slug === slug);

      if (!feature) {
        // Feature doesn't exist, default to false
        return false;
      }

      // If feature is not enabled globally, rollout doesn't apply
      if (!feature.enabled) {
        return false;
      }

      // Use the A/B testing utility with the feature's rollout percentage and salt
      return isUserInRollout(userId, slug, feature.rolloutPercentage, feature.salt);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfUserHasFeatureWithRollout(
    userId: number,
    slug: keyof AppFlags,
    options: { skipRolloutCheck?: boolean } = {}
  ): Promise<boolean> {
    try {
      // First check direct assignments (user or team)
      const hasDirectAccess = await this.checkIfUserHasFeature(userId, slug);
      if (hasDirectAccess) return true;

      // If skipRolloutCheck is true, don't check A/B testing
      if (options.skipRolloutCheck) return false;

      // Check if user is in the A/B test rollout
      return await this.checkIfUserIsInFeatureRollout(userId, slug);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateFeatureRollout(slug: keyof AppFlags, rolloutPercentage: number, salt?: string): Promise<void> {
    try {
      // Validate rollout percentage
      if (rolloutPercentage < 0 || rolloutPercentage > 100) {
        throw new Error("Rollout percentage must be between 0 and 100");
      }

      const updateData: { rolloutPercentage: number; salt?: string } = {
        rolloutPercentage,
      };

      // Only update salt if provided
      if (salt !== undefined) {
        updateData.salt = salt;
      }

      await this.prismaClient.feature.update({
        where: { slug },
        data: updateData,
      });

      // Clear cache when features are modified
      this.clearCache();
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a team is included in the A/B test rollout for a specific feature.
   * This method respects the feature's rolloutPercentage and salt for deterministic bucketing.
   * The same team will always get the same result unless the salt changes.
   *
   * @param teamId - The ID of the team to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the team is in the rollout group, false otherwise
   * @throws Error if the feature check fails
   *
   * @example
   * ```ts
   * // Check if team 456 is in the rollout for "new-feature"
   * const isInRollout = await repo.checkIfTeamIsInFeatureRollout(456, "new-feature");
   * ```
   */
  async checkIfTeamIsInFeatureRollout(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    try {
      const features = await this.getAllFeatures();
      const feature = features.find((f) => f.slug === slug);

      if (!feature) {
        // Feature doesn't exist, default to false
        return false;
      }

      // If feature is not enabled globally, rollout doesn't apply
      if (!feature.enabled) {
        return false;
      }

      // Use the A/B testing utility with the feature's rollout percentage and salt
      return isTeamInRollout(teamId, slug, feature.rolloutPercentage, feature.salt);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a team has access to a feature, including A/B test rollout logic.
   * This is a comprehensive check that includes:
   * 1. Direct team feature assignments
   * 2. Parent team-based feature access (hierarchical)
   * 3. A/B test rollout percentage
   *
   * @param teamId - The ID of the team to check
   * @param slug - The feature identifier to check
   * @param options - Optional configuration
   * @param options.skipRolloutCheck - If true, skips the A/B test rollout check (default: false)
   * @returns Promise<boolean> - True if the team has access to the feature, false otherwise
   * @throws Error if the feature access check fails
   *
   * @example
   * ```ts
   * // Full check including rollout
   * const hasAccess = await repo.checkIfTeamHasFeatureWithRollout(456, "new-feature");
   *
   * // Skip rollout check (only check direct/parent assignments)
   * const hasDirectAccess = await repo.checkIfTeamHasFeatureWithRollout(456, "new-feature", {
   *   skipRolloutCheck: true
   * });
   * ```
   */
  async checkIfTeamHasFeatureWithRollout(
    teamId: number,
    slug: keyof AppFlags,
    options: { skipRolloutCheck?: boolean } = {}
  ): Promise<boolean> {
    try {
      // First check direct assignments (team or parent team)
      const hasDirectAccess = await this.checkIfTeamHasFeature(teamId, slug);
      if (hasDirectAccess) return true;

      // If skipRolloutCheck is true, don't check A/B testing
      if (options.skipRolloutCheck) return false;

      // Check if team is in the A/B test rollout
      return await this.checkIfTeamIsInFeatureRollout(teamId, slug);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
