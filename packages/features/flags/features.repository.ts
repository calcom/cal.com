import { Prisma } from "@prisma/client";
import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

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
  private static featuresCache: { data: any[]; expiry: number } | null = null;

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

    const features = await db.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
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
    const result = await db.teamFeatures.findMany({
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
      const userHasFeature = await db.userFeatures.findFirst({
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

      const result = await db.$queryRaw<unknown[]>(query);
      return result.length > 0;
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
      const teamHasFeature = await db.teamFeatures.findUnique({
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

      const result = await db.$queryRaw<unknown[]>(query);
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
}
