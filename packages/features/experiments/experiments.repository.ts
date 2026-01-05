import type { PrismaClient } from "@calcom/prisma";
import type { ExperimentAssignmentType } from "@calcom/prisma/enums";

import type {
  ExperimentMetadata,
  ExperimentVariantConfig,
  GetVariantOptions,
  VariantAssignment,
} from "./types";
import { assignVariantDeterministic, assignVariantRandom } from "./utils/variant-assignment";

export class ExperimentsRepository {
  constructor(private prisma: PrismaClient) {}

  private async getExperimentConfig(experimentSlug: string): Promise<ExperimentMetadata | null> {
    const feature = await this.prisma.feature.findUnique({
      where: { slug: experimentSlug },
      select: {
        enabled: true,
        type: true,
        metadata: true,
      },
    });

    if (!feature || feature.type !== "EXPERIMENT" || !feature.enabled) {
      return null;
    }

    return feature.metadata as unknown as ExperimentMetadata;
  }

  async getVariantForUser(
    experimentSlug: string,
    options: GetVariantOptions
  ): Promise<VariantAssignment | null> {
    const { userId, teamId } = options;

    if (!userId && !teamId) {
      throw new Error("Must provide userId or teamId");
    }

    const config = await this.getExperimentConfig(experimentSlug);
    if (!config) {
      return null;
    }

    // if experiment is concluded with a winner, everyone gets the winner variant
    if (config.status === "concluded" && config.winnerVariant) {
      const existing = await this.prisma.experimentVariant.findFirst({
        where: {
          experimentSlug,
          ...(userId && { userId }),
          ...(teamId && { teamId }),
        },
      });

      // update existing assignment to winner if different
      if (existing && existing.variant !== config.winnerVariant) {
        await this.prisma.experimentVariant.update({
          where: { id: existing.id },
          data: { variant: config.winnerVariant },
        });
      }

      // create new assignment with winner variant
      if (!existing) {
        await this.prisma.experimentVariant.create({
          data: {
            experimentSlug,
            variant: config.winnerVariant,
            userId,
            teamId,
            assignmentType: config.assignmentType,
          },
        });
      }

      return {
        variant: config.winnerVariant,
        experimentSlug,
        assignmentType: config.assignmentType,
        isNewAssignment: !existing,
      };
    }

    // only assign variants if experiment is running
    if (config.status && config.status !== "running") {
      return null;
    }

    const existing = await this.prisma.experimentVariant.findFirst({
      where: {
        experimentSlug,
        ...(userId && { userId }),
        ...(teamId && { teamId }),
      },
    });

    if (existing) {
      return {
        variant: existing.variant,
        experimentSlug,
        assignmentType: existing.assignmentType as ExperimentAssignmentType,
        isNewAssignment: false,
      };
    }

    const variant = this.assignVariant(experimentSlug, config.variants, config.assignmentType, options);

    await this.prisma.experimentVariant.create({
      data: {
        experimentSlug,
        variant,
        userId,
        teamId,
        assignmentType: config.assignmentType,
      },
    });

    return {
      variant,
      experimentSlug,
      assignmentType: config.assignmentType,
      isNewAssignment: true,
    };
  }

  private assignVariant(
    experimentSlug: string,
    variants: ExperimentVariantConfig[],
    assignmentType: ExperimentAssignmentType,
    options: GetVariantOptions
  ): string {
    if (assignmentType === "RANDOM") {
      return assignVariantRandom(variants);
    }

    const identifier = options.userId ? `user-${options.userId}` : `team-${options.teamId!}`;
    return assignVariantDeterministic(identifier, experimentSlug, variants);
  }

  async checkIfAssignedToFeature(experimentSlug: string, options: GetVariantOptions): Promise<boolean> {
    const { userId, teamId } = options;

    if (teamId) {
      const teamFeature = await this.prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId,
            featureId: experimentSlug,
          },
        },
      });
      if (teamFeature?.enabled) return true;
    }

    if (userId) {
      const userFeature = await this.prisma.userFeatures.findFirst({
        where: {
          userId,
          featureId: experimentSlug,
        },
      });
      if (userFeature?.enabled) return true;

      const userTeamsWithFeature = await this.prisma.teamFeatures.findFirst({
        where: {
          featureId: experimentSlug,
          enabled: true,
          team: {
            members: {
              some: {
                userId,
                accepted: true,
              },
            },
          },
        },
      });
      if (userTeamsWithFeature) return true;
    }

    return false;
  }

  /**
   * Migrate all existing assignments to the winner variant
   * Useful when concluding an experiment with a winner
   */
  async migrateToWinnerVariant(experimentSlug: string, winnerVariant: string): Promise<number> {
    const result = await this.prisma.experimentVariant.updateMany({
      where: {
        experimentSlug,
        variant: {
          not: winnerVariant,
        },
      },
      data: {
        variant: winnerVariant,
      },
    });

    return result.count;
  }
}
