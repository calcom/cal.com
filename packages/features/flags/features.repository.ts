import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags, FeatureId, TeamFeatures } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import { PrismaTeamFeatureRepository } from "./repositories/PrismaTeamFeatureRepository";
import { PrismaUserFeatureRepository } from "./repositories/PrismaUserFeatureRepository";

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
  private teamFeatureRepository: PrismaTeamFeatureRepository;
  private userFeatureRepository: PrismaUserFeatureRepository;

  constructor(private prismaClient: PrismaClient) {
    this.teamFeatureRepository = new PrismaTeamFeatureRepository(prismaClient);
    this.userFeatureRepository = new PrismaUserFeatureRepository(prismaClient);
  }

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
   * Gets all features enabled for a specific team in a map format.
   * Delegates to PrismaTeamFeatureRepository.
   */
  public async getEnabledTeamFeatures(teamId: number): Promise<TeamFeatures | null> {
    return this.teamFeatureRepository.getEnabledFeatures(teamId);
  }

  /**
   * Checks if a team or any of its ancestors has access to a specific feature.
   * Delegates to PrismaTeamFeatureRepository.
   */
  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    return this.teamFeatureRepository.checkIfTeamHasFeature(teamId, featureId);
  }

  /**
   * Checks if a specific user has access to a feature based on user and team assignments.
   * Delegates to PrismaUserFeatureRepository.
   */
  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    return this.userFeatureRepository.checkIfUserHasFeature(userId, slug);
  }

  /**
   * Checks if a specific user has access to a feature, ignoring hierarchical (parent) teams.
   * Delegates to PrismaUserFeatureRepository.
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    return this.userFeatureRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
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
}
