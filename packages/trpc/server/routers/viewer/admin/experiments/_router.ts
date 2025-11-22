import { z } from "zod";

import { ExperimentsRepository } from "@calcom/features/experiments/experiments.repository";
import type { Prisma } from "@calcom/prisma/client";

import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const ZGetExperimentConfigSchema = z.object({
  experimentSlug: z.string(),
});

export const ZUpdateExperimentConfigSchema = z.object({
  experimentSlug: z.string(),
  variants: z.array(
    z.object({
      name: z.string(),
      percentage: z.number().min(0).max(100),
    })
  ),
  assignmentType: z.enum(["deterministic", "random"]),
});

export const ZGetExperimentAssignmentsSchema = z.object({
  experimentSlug: z.string(),
  userId: z.number().optional(),
  teamId: z.number().optional(),
});

export const ZUpdateExperimentAssignmentSchema = z.object({
  experimentSlug: z.string(),
  variant: z.string(),
  userId: z.number().optional(),
  teamId: z.number().optional(),
});

export const experimentsRouter = router({
  getConfig: authedAdminProcedure.input(ZGetExperimentConfigSchema).query(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const repository = new ExperimentsRepository(prisma);
    return repository.getExperimentConfig(input.experimentSlug);
  }),

  updateConfig: authedAdminProcedure.input(ZUpdateExperimentConfigSchema).mutation(async ({ ctx, input }) => {
    const { prisma, user } = ctx;
    const feature = await prisma.feature.findUnique({
      where: { slug: input.experimentSlug },
      select: { type: true },
    });

    if (!feature || feature.type !== "EXPERIMENT") {
      throw new Error("Feature is not an experiment");
    }

    const totalPercentage = input.variants.reduce((sum: number, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error("Variant percentages must sum to 100");
    }

    await prisma.feature.update({
      where: { slug: input.experimentSlug },
      data: {
        metadata: {
          variants: input.variants,
          assignmentType: input.assignmentType,
        } as Prisma.InputJsonValue,
        updatedBy: user.id,
      },
    });

    return { success: true };
  }),

  getAssignment: authedAdminProcedure.input(ZGetExperimentAssignmentsSchema).query(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const repository = new ExperimentsRepository(prisma);

    if (input.userId) {
      return repository.getVariantForUser(input.userId, input.experimentSlug, { assignIfMissing: false });
    }
    if (input.teamId) {
      return repository.getVariantForTeam(input.teamId, input.experimentSlug, { assignIfMissing: false });
    }
    return null;
  }),

  updateAssignment: authedAdminProcedure
    .input(ZUpdateExperimentAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const repository = new ExperimentsRepository(prisma);
      const config = await repository.getExperimentConfig(input.experimentSlug);

      if (!config) {
        throw new Error("Experiment not found or not enabled");
      }

      const variantExists = config.variants.some((v) => v.name === input.variant);
      if (!variantExists) {
        throw new Error(`Variant ${input.variant} does not exist`);
      }

      if (input.userId) {
        await prisma.experimentVariant.upsert({
          where: {
            experiment_user_unique: {
              experimentSlug: input.experimentSlug,
              userId: input.userId,
            },
          },
          create: {
            experimentSlug: input.experimentSlug,
            variant: input.variant,
            userId: input.userId,
            assignmentType: config.assignmentType === "deterministic" ? "DETERMINISTIC" : "RANDOM",
          },
          update: {
            variant: input.variant,
          },
        });
      } else if (input.teamId) {
        await prisma.experimentVariant.upsert({
          where: {
            experiment_team_unique: {
              experimentSlug: input.experimentSlug,
              teamId: input.teamId,
            },
          },
          create: {
            experimentSlug: input.experimentSlug,
            variant: input.variant,
            teamId: input.teamId,
            assignmentType: config.assignmentType === "deterministic" ? "DETERMINISTIC" : "RANDOM",
          },
          update: {
            variant: input.variant,
          },
        });
      }

      return { success: true };
    }),
});
