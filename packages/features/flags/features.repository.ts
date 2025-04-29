import { Prisma } from "@prisma/client";
import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

import type { AppFlags } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

interface CacheEntry {
  value: boolean; // adapt to other supported value types in the future
  expiry: number;
}

interface CacheOptions {
  ttl: number; // time in ms
}

/**
 * Repository class for managing feature flags and feature access control.
 * Implements the IFeaturesRepository interface to provide feature flag functionality
 * for users, teams, and global application features.
 */
export class FeaturesRepository implements IFeaturesRepository {
  // This is a temporary cache to avoid hitting the database on every lambda invocation
  private static TEMP_CACHE: AppFlags | null = null;
  private static featureFlagCache = new Map<keyof AppFlags, CacheEntry>();
  private static featuresCache: { data: any[]; expiry: number } | null = null;

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiry;
  }

  private clearCache() {
    FeaturesRepository.TEMP_CACHE = null;
    FeaturesRepository.featureFlagCache.clear();
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
    // If we've already fetched the flags, return them
    if (FeaturesRepository.TEMP_CACHE) return FeaturesRepository.TEMP_CACHE;
    const flags = await this.getAllFeatures();
    FeaturesRepository.TEMP_CACHE = flags.reduce((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
    return FeaturesRepository.TEMP_CACHE;
  }

  /**
   * Checks if a feature is enabled globally in the application.
   * @param slug - The feature flag identifier to check
   * @returns Promise<boolean> - True if the feature is enabled globally, false otherwise
   * @throws Error if the feature flag check fails
   */
  async checkIfFeatureIsEnabledGlobally(
    slug: keyof AppFlags,
    options: CacheOptions = { ttl: 5 * 60 * 1000 }
  ): Promise<boolean> {
    try {
      // pre-compute all app flags, each one will independently reload its own state after expiry.
      if (FeaturesRepository.featureFlagCache.size === 0) {
        const flags = await db.feature.findMany({ orderBy: { slug: "asc" } });
        flags.forEach((flag) => {
          FeaturesRepository.featureFlagCache.set(flag.slug as keyof AppFlags, {
            value: flag.enabled,
            expiry: Date.now() + options.ttl,
          });
        });
      }

      const cacheEntry = FeaturesRepository.featureFlagCache.get(slug);

      if (cacheEntry && !this.isExpired(cacheEntry)) {
        return cacheEntry.value;
      }

      const flag = await db.feature.findUnique({
        where: {
          slug,
        },
      });

      const isEnabled = Boolean(flag && flag.enabled);
      const expiry = Date.now() + options.ttl;

      FeaturesRepository.featureFlagCache.set(slug, { value: isEnabled, expiry });

      return isEnabled;
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
          SELECT t.id, t."parentId"
          FROM "Team" t
          INNER JOIN "Membership" m ON m."teamId" = t.id
          WHERE m."userId" = ${userId}

          UNION ALL

          -- Recursively get parent teams
          SELECT t.id, t."parentId"
          FROM "Team" t
          INNER JOIN TeamHierarchy th ON t.id = th."parentId"
        )
        -- Check if any team in the hierarchy has the feature
        SELECT 1
        FROM "TeamFeatures" tf
        WHERE tf."featureId" = ${slug}
        AND tf."teamId" IN (SELECT id FROM TeamHierarchy)
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
      // NOTE: Ensure table ("Team", "TeamFeatures") and column ("id", "parentId", "featureId", "teamId")
      // names exactly match your Prisma schema.
      const query = Prisma.sql`
        WITH RECURSIVE Ancestors AS (
          -- Anchor member: Start with the initial team
          SELECT id, "parentId"
          FROM "Team"
          WHERE id = ${teamId}

          UNION ALL

          -- Recursive member: Find the parent of the team found in the previous step
          SELECT T.id, T."parentId"
          FROM "Team" T
          INNER JOIN Ancestors A ON T.id = A."parentId"
        )
        -- Final check: See if any team ID from the Ancestors list has the feature
        SELECT 1
        FROM "TeamFeatures" TF
        WHERE
          TF."featureId" = ${featureId}
          AND TF."teamId" IN (SELECT id FROM Ancestors)
        LIMIT 1;
      `;

      // Use a more general type for raw query result
      const result = await db.$queryRaw<unknown[]>(query);

      // Return true if the query returned any row
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
