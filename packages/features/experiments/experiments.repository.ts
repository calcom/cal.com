import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type {
  AssignmentType,
  ExperimentConfig,
  ExperimentAssignmentOptions,
  VariantAssignmentResult,
} from "./types";
import { toPrismaAssignmentType, fromPrismaAssignmentType } from "./types";
import { getVariantForUser, getVariantForTeam, getVariantForVisitor } from "./utils/variant-assignment";

interface ExperimentCacheEntry {
  variant: string;
  assignmentType: AssignmentType;
  expiry: number;
}

interface ExperimentCache {
  [key: string]: ExperimentCacheEntry;
}

export class ExperimentsRepository {
  private static experimentCache: ExperimentCache = {};
  private static readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(private prismaClient: PrismaClient) {}

  private clearCache() {
    ExperimentsRepository.experimentCache = {};
  }

  private getCacheKey(experimentSlug: string, userId?: number, teamId?: number, visitorId?: string): string {
    if (userId) return `user:${userId}:${experimentSlug}`;
    if (teamId) return `team:${teamId}:${experimentSlug}`;
    if (visitorId) return `visitor:${visitorId}:${experimentSlug}`;
    throw new Error("Must provide userId, teamId, or visitorId");
  }

  private getCachedVariant(cacheKey: string): { variant: string; assignmentType: AssignmentType } | null {
    const cached = ExperimentsRepository.experimentCache[cacheKey];
    if (cached && Date.now() < cached.expiry) {
      return {
        variant: cached.variant,
        assignmentType: cached.assignmentType,
      };
    }
    return null;
  }

  private setCachedVariant(cacheKey: string, variant: string, assignmentType: AssignmentType) {
    ExperimentsRepository.experimentCache[cacheKey] = {
      variant,
      assignmentType,
      expiry: Date.now() + ExperimentsRepository.CACHE_TTL,
    };
  }

  async checkExperimentExists(experimentSlug: string): Promise<boolean> {
    try {
      const feature = await this.prismaClient.feature.findUnique({
        where: { slug: experimentSlug },
        select: { enabled: true, type: true },
      });

      return feature?.type === "EXPERIMENT" && feature.enabled === true;
    } catch (err) {
      captureException(err);
      return false;
    }
  }

  async getExperimentConfig(experimentSlug: string): Promise<ExperimentConfig | null> {
    try {
      const feature = await this.prismaClient.feature.findUnique({
        where: { slug: experimentSlug },
        select: { enabled: true, type: true, metadata: true },
      });

      if (!feature || feature.type !== "EXPERIMENT" || feature.enabled !== true) {
        return null;
      }

      const metadata = feature.metadata as { variants?: ExperimentVariantConfig[]; assignmentType?: AssignmentType } | null;

      if (metadata?.variants && metadata.assignmentType) {
        return {
          slug: experimentSlug,
          variants: metadata.variants,
          assignmentType: metadata.assignmentType,
          enabled: feature.enabled,
        };
      }

      return {
        slug: experimentSlug,
        variants: [
          { name: "control", percentage: 50 },
          { name: "treatment", percentage: 50 },
        ],
        assignmentType: "deterministic",
        enabled: feature.enabled,
      };
    } catch (err) {
      captureException(err);
      return null;
    }
  }

  async getVariantForUser(
    userId: number,
    experimentSlug: string,
    options: ExperimentAssignmentOptions = {}
  ): Promise<VariantAssignmentResult | null> {
    try {
      const cacheKey = this.getCacheKey(experimentSlug, userId);

      if (!options.skipCache) {
        const cached = this.getCachedVariant(cacheKey);
        if (cached) {
          return {
            variant: cached.variant,
            assignmentType: cached.assignmentType,
            isNewAssignment: false,
            experimentSlug,
          };
        }
      }

      const experimentExists = await this.checkExperimentExists(experimentSlug);
      if (!experimentExists) {
        return null;
      }

      const existing = await this.prismaClient.experimentVariant.findUnique({
        where: {
          experiment_user_unique: {
            experimentSlug,
            userId,
          },
        },
      });

      if (existing) {
        const assignmentType = fromPrismaAssignmentType(existing.assignmentType);
        this.setCachedVariant(cacheKey, existing.variant, assignmentType);
        return {
          variant: existing.variant,
          assignmentType,
          isNewAssignment: false,
          experimentSlug,
        };
      }

      if (options.assignIfMissing !== false) {
        const config = await this.getExperimentConfig(experimentSlug);
        if (!config) {
          return null;
        }

        const variant = getVariantForUser(userId, experimentSlug, config, config.assignmentType);

        await this.prismaClient.experimentVariant.create({
          data: {
            experimentSlug,
            variant,
            userId,
            assignmentType: toPrismaAssignmentType(config.assignmentType),
            metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : undefined,
          },
        });

        this.setCachedVariant(cacheKey, variant, config.assignmentType);

        return {
          variant,
          assignmentType: config.assignmentType,
          isNewAssignment: true,
          experimentSlug,
        };
      }

      return null;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getVariantForTeam(
    teamId: number,
    experimentSlug: string,
    options: ExperimentAssignmentOptions = {}
  ): Promise<VariantAssignmentResult | null> {
    try {
      const cacheKey = this.getCacheKey(experimentSlug, undefined, teamId);

      if (!options.skipCache) {
        const cached = this.getCachedVariant(cacheKey);
        if (cached) {
          return {
            variant: cached.variant,
            assignmentType: cached.assignmentType,
            isNewAssignment: false,
            experimentSlug,
          };
        }
      }

      const experimentExists = await this.checkExperimentExists(experimentSlug);
      if (!experimentExists) {
        return null;
      }

      const existing = await this.prismaClient.experimentVariant.findUnique({
        where: {
          experiment_team_unique: {
            experimentSlug,
            teamId,
          },
        },
      });

      if (existing) {
        const assignmentType = fromPrismaAssignmentType(existing.assignmentType);
        this.setCachedVariant(cacheKey, existing.variant, assignmentType);
        return {
          variant: existing.variant,
          assignmentType,
          isNewAssignment: false,
          experimentSlug,
        };
      }

      if (options.assignIfMissing !== false) {
        const config = await this.getExperimentConfig(experimentSlug);
        if (!config) {
          return null;
        }

        const variant = getVariantForTeam(teamId, experimentSlug, config, config.assignmentType);

        await this.prismaClient.experimentVariant.create({
          data: {
            experimentSlug,
            variant,
            teamId,
            assignmentType: toPrismaAssignmentType(config.assignmentType),
            metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : undefined,
          },
        });

        this.setCachedVariant(cacheKey, variant, config.assignmentType);

        return {
          variant,
          assignmentType: config.assignmentType,
          isNewAssignment: true,
          experimentSlug,
        };
      }

      return null;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getVariantForVisitor(
    visitorId: string,
    experimentSlug: string,
    options: ExperimentAssignmentOptions = {}
  ): Promise<VariantAssignmentResult | null> {
    try {
      const cacheKey = this.getCacheKey(experimentSlug, undefined, undefined, visitorId);

      if (!options.skipCache) {
        const cached = this.getCachedVariant(cacheKey);
        if (cached) {
          return {
            variant: cached.variant,
            assignmentType: cached.assignmentType,
            isNewAssignment: false,
            experimentSlug,
          };
        }
      }

      const experimentExists = await this.checkExperimentExists(experimentSlug);
      if (!experimentExists) {
        return null;
      }

      const existing = await this.prismaClient.experimentVariant.findUnique({
        where: {
          experiment_visitor_unique: {
            experimentSlug,
            visitorId,
          },
        },
      });

      if (existing) {
        const assignmentType = fromPrismaAssignmentType(existing.assignmentType);
        this.setCachedVariant(cacheKey, existing.variant, assignmentType);
        return {
          variant: existing.variant,
          assignmentType,
          isNewAssignment: false,
          experimentSlug,
        };
      }

      if (options.assignIfMissing !== false) {
        const config = await this.getExperimentConfig(experimentSlug);
        if (!config) {
          return null;
        }

        const variant = getVariantForVisitor(visitorId, experimentSlug, config, config.assignmentType);

        await this.prismaClient.experimentVariant.create({
          data: {
            experimentSlug,
            variant,
            visitorId,
            assignmentType: toPrismaAssignmentType(config.assignmentType),
            metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : undefined,
          },
        });

        this.setCachedVariant(cacheKey, variant, config.assignmentType);

        return {
          variant,
          assignmentType: config.assignmentType,
          isNewAssignment: true,
          experimentSlug,
        };
      }

      return null;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
