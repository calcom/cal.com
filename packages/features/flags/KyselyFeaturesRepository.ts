import { captureException } from "@sentry/nextjs";
import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";

import type { AppFlags, TeamFeatures } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

interface CacheOptions {
  ttl: number; // time in ms
}

interface FeatureRow {
  slug: string;
  enabled: boolean;
  description: string | null;
  stale: boolean | null;
  lastUsedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  type: string | null;
}

/**
 * Kysely implementation of FeaturesRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyFeaturesRepository implements IFeaturesRepository {
  private static featuresCache: { data: FeatureRow[]; expiry: number } | null = null;

  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  private clearCache() {
    KyselyFeaturesRepository.featuresCache = null;
  }

  /**
   * Gets all features with their enabled status.
   * Uses caching to avoid hitting the database on every request.
   */
  public async getAllFeatures(): Promise<FeatureRow[]> {
    if (KyselyFeaturesRepository.featuresCache && Date.now() < KyselyFeaturesRepository.featuresCache.expiry) {
      return KyselyFeaturesRepository.featuresCache.data;
    }

    const features = await this.readDb
      .selectFrom("Feature")
      .selectAll()
      .orderBy("slug", "asc")
      .execute();

    KyselyFeaturesRepository.featuresCache = {
      data: features as FeatureRow[],
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes cache
    };

    return features as FeatureRow[];
  }

  /**
   * Gets a map of all feature flags and their enabled status.
   */
  public async getFeatureFlagMap(): Promise<AppFlags> {
    const flags = await this.getAllFeatures();
    return flags.reduce((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }

  /**
   * Gets all features enabled for a specific team in a map format.
   */
  public async getTeamFeatures(teamId: number): Promise<TeamFeatures | null> {
    const result = await this.readDb
      .selectFrom("TeamFeatures")
      .innerJoin("Feature", "Feature.slug", "TeamFeatures.featureId")
      .select(["Feature.slug", "Feature.enabled"])
      .where("TeamFeatures.teamId", "=", teamId)
      .execute();

    if (!result.length) return null;

    const features: TeamFeatures = Object.fromEntries(
      result.map((teamFeature) => [teamFeature.slug, true])
    ) as TeamFeatures;

    return features;
  }

  /**
   * Checks if a feature is enabled globally in the application.
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
   */
  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    try {
      const userHasFeature = await this.readDb
        .selectFrom("UserFeatures")
        .select(["userId"])
        .where("userId", "=", userId)
        .where("featureId", "=", slug)
        .executeTakeFirst();

      if (userHasFeature) return true;

      // If the user doesn't have the feature, check if they belong to a team with the feature.
      const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
      if (userBelongsToTeamWithFeature) return true;

      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a specific user has access to a feature, ignoring hierarchical (parent) teams.
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    try {
      const userHasFeature = await this.readDb
        .selectFrom("UserFeatures")
        .select(["userId"])
        .where("userId", "=", userId)
        .where("featureId", "=", slug)
        .executeTakeFirst();

      if (userHasFeature) return true;

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
   */
  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    try {
      const result = await sql<{ exists: number }>`
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
        SELECT 1 as exists
        FROM TeamHierarchy
        WHERE has_feature = true
        LIMIT 1
      `.execute(this.readDb);

      return result.rows.length > 0;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a user belongs to any direct team that has access to a feature.
   */
  private async checkIfUserBelongsToTeamWithFeatureNonHierarchical(
    userId: number,
    slug: string
  ): Promise<boolean> {
    try {
      const result = await sql<{ exists: number }>`
        SELECT 1 as exists
        FROM "Team" t
        INNER JOIN "Membership" m ON m."teamId" = t.id
        WHERE m."userId" = ${userId}
          AND m.accepted = true
          AND EXISTS (
            SELECT 1
            FROM "TeamFeatures" tf
            WHERE tf."teamId" = t.id
              AND tf."featureId" = ${slug}
          )
        LIMIT 1
      `.execute(this.readDb);

      return result.rows.length > 0;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Enables a feature for a specific team.
   */
  async enableFeatureForTeam(teamId: number, featureId: keyof AppFlags, assignedBy: string): Promise<void> {
    try {
      // Use upsert pattern with Kysely
      await this.writeDb
        .insertInto("TeamFeatures")
        .values({
          teamId,
          featureId,
          assignedBy,
        })
        .onConflict((oc) =>
          oc.columns(["teamId", "featureId"]).doNothing()
        )
        .execute();

      // Clear cache when features are modified
      this.clearCache();
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a team or any of its ancestors has access to a specific feature.
   */
  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    try {
      // Early return if team has feature directly assigned
      const teamHasFeature = await this.readDb
        .selectFrom("TeamFeatures")
        .select(["teamId"])
        .where("teamId", "=", teamId)
        .where("featureId", "=", featureId)
        .executeTakeFirst();

      if (teamHasFeature) return true;

      const result = await sql<{ exists: number }>`
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
        SELECT 1 as exists
        FROM TeamHierarchy
        WHERE has_feature = true
        LIMIT 1
      `.execute(this.readDb);

      return result.rows.length > 0;
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

      const rows = await this.readDb
        .selectFrom("TeamFeatures")
        .select(["teamId"])
        .where("featureId", "=", slug)
        .orderBy("teamId", "asc")
        .execute();

      return rows.map((r) => r.teamId);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
