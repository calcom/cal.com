import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { AppFlags, FeatureId, FeatureState, TeamFeatures } from "./config";
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

  constructor(private prismaClient: PrismaClient) { }

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
      acc[flag.slug as FeatureId] = flag.enabled;
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
    slug: FeatureId,
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
   * Checks if a specific user has access to multiple features in a single operation.
   *
   * @param userId - The ID of the user to check
   * @param slugs - Array of feature identifiers to check
   * @returns Promise<Record<string, boolean>> - A record mapping each slug to its enabled status
   * @throws Error if the feature access check fails
   */
  async getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>> {
    try {
      if (slugs.length === 0) {
        return {};
      }

      const featuresStatus: Record<string, boolean> = Object.fromEntries(slugs.map((slug) => [slug, false]));

      const userFeatures = await this.prismaClient.userFeatures.findMany({
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
        // If the feature is not configured for the user, check team-level
        if (!featuresConfiguredForUser.has(slug)) {
          slugsToCheckAtTeamLevel.push(slug);
        }
      }

      await Promise.all(slugsToCheckAtTeamLevel.map(async (slug) => {
        const hasTeamFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
        featuresStatus[slug] = hasTeamFeature;
      }))

      return featuresStatus;
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
   * Updates a feature status for a specific user.
   * Uses tri-state semantics:
   * - 'enabled': creates/updates a row with enabled=true
   * - 'disabled': creates/updates a row with enabled=false
   * - 'inherit': deletes the row to inherit from team/org level
   *
   * @param input.userId - The ID of the user to update the feature for
   * @param input.featureId - The feature identifier to update
   * @param input.state - 'enabled' | 'disabled' | 'inherit'
   * @param input.assignedBy - The user or what assigned the feature (required for enabled/disabled, not used for inherit)
   * @returns Promise<void>
   * @throws Error if the feature update fails
   */
  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { userId, featureId, state } = input;
    try {
      if (state === "enabled" || state === "disabled") {
        const { assignedBy } = input;
        await this.prismaClient.userFeatures.upsert({
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
        await this.prismaClient.userFeatures.deleteMany({
          where: {
            userId,
            featureId,
          },
        });
      }
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Updates a feature status for a specific team.
   * Uses tri-state semantics: creates/updates a row with enabled=true.
   * @param input.teamId - The ID of the team to enable the feature for
   * @param input.featureId - The feature identifier to enable
   * @param input.state - 'enabled' | 'disabled' | 'inherit'
   * @param input.assignedBy - The user or what assigned the feature (required for enabled/disabled, not used for inherit)
   * @returns Promise<void>
   * @throws Error if the feature enabling fails
   */
  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { teamId, featureId, state } = input;
    try {
      if (state === "enabled" || state === "disabled") {
        const { assignedBy } = input;
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
  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
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

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
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

  /**
   * Get user's feature states for multiple features.
   * Uses tri-state semantics:
   * - Row with enabled=true → 'enabled'
   * - Row with enabled=false → 'disabled'
   * - No row → 'inherit' from team/org level
   *
   * @param input - Object containing userId and featureIds array
   * @returns Record<featureId, 'enabled' | 'disabled' | 'inherit'>
   */
  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Partial<Record<FeatureId, FeatureState>>> {
    const { userId, featureIds } = input;

    try {
      // Initialize result with all features set to 'inherit'
      const result: Partial<Record<FeatureId, FeatureState>> = {};
      for (const featureId of featureIds) {
        result[featureId] = "inherit";
      }

      // Query all user features in a single call
      const userFeatures = await this.prismaClient.userFeatures.findMany({
        where: {
          userId,
          featureId: { in: featureIds },
        },
        select: { featureId: true, enabled: true },
      });

      // Update result with actual values from database
      for (const userFeature of userFeatures) {
        result[userFeature.featureId as FeatureId] = userFeature.enabled ? "enabled" : "disabled";
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Get multiple features' states across multiple teams.
   * Optimized for querying many teams for many features in one call.
   * Uses tri-state semantics:
   * - Row with enabled=true → 'enabled'
   * - Row with enabled=false → 'disabled'
   * - No row → 'inherit' from parent team/org level
   *
   * @param input - Object containing teamIds array and featureIds array
   * @returns Record<featureId, Record<teamId, 'enabled' | 'disabled' | 'inherit'>>
   */
  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>> {
    const { teamIds, featureIds } = input;

    if (teamIds.length === 0 || featureIds.length === 0) {
      return {} as Partial<Record<FeatureId, Record<number, FeatureState>>>;
    }

    try {
      // Initialize result with all features present to avoid undefined feature keys
      const result: Partial<Record<FeatureId, Record<number, FeatureState>>> = {};
      for (const featureId of featureIds) {
        result[featureId] = {};
      }

      // Query all team features in a single call
      const teamFeatures = await this.prismaClient.teamFeatures.findMany({
        where: {
          teamId: { in: teamIds },
          featureId: { in: featureIds },
        },
        select: { teamId: true, featureId: true, enabled: true },
      });

      // Build result map - teams not in the result will default to 'inherit'
      for (const teamFeature of teamFeatures) {
        const featureStates = result[teamFeature.featureId as FeatureId] ?? {};
        featureStates[teamFeature.teamId] = teamFeature.enabled ? "enabled" : "disabled";
        result[teamFeature.featureId as FeatureId] = featureStates;
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Get user's autoOptInFeatures flag.
   * @param userId - The ID of the user
   * @returns Promise<boolean> - True if user has auto opt-in enabled, false otherwise
   */
  async getUserAutoOptIn(userId: number): Promise<boolean> {
    try {
      const user = await this.prismaClient.user.findUnique({
        where: { id: userId },
        select: { autoOptInFeatures: true },
      });
      return user?.autoOptInFeatures ?? false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Get autoOptInFeatures for multiple teams (batch).
   * @param teamIds - Array of team IDs to query
   * @returns Promise<Record<number, boolean>> - Map of teamId to autoOptInFeatures value
   */
  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    if (teamIds.length === 0) {
      return {};
    }

    try {
      const teams = await this.prismaClient.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, autoOptInFeatures: true },
      });

      const result: Record<number, boolean> = {};
      for (const team of teams) {
        result[team.id] = team.autoOptInFeatures;
      }
      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Set user's autoOptInFeatures flag.
   * @param userId - The ID of the user
   * @param enabled - Whether to enable auto opt-in for all features
   * @returns Promise<void>
   */
  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    try {
      await this.prismaClient.user.update({
        where: { id: userId },
        data: { autoOptInFeatures: enabled },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Set team's autoOptInFeatures flag.
   * @param teamId - The ID of the team
   * @param enabled - Whether to enable auto opt-in for all features
   * @returns Promise<void>
   */
  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    try {
      await this.prismaClient.team.update({
        where: { id: teamId },
        data: { autoOptInFeatures: enabled },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
