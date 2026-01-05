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
}
