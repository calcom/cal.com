import type { PrismaClient } from "@calcom/prisma";

import type { TGetExperimentStatsSchema } from "./getExperimentStats.schema";

interface GetExperimentStatsOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TGetExperimentStatsSchema;
}

interface VariantStats {
  variant: string;
  count: number;
  percentage: number;
}

interface ExperimentStats {
  experimentSlug: string;
  totalAssignments: number;
  variantStats: VariantStats[];
}

export const getExperimentStatsHandler = async ({
  ctx,
  input,
}: GetExperimentStatsOptions): Promise<ExperimentStats> => {
  const { experimentSlug } = input;

  // get all assignments for this experiment
  const assignments = await ctx.prisma.experimentVariant.groupBy({
    by: ["variant"],
    where: {
      experimentSlug,
    },
    _count: {
      variant: true,
    },
  });

  const totalAssignments = assignments.reduce((sum, a) => sum + a._count.variant, 0);

  const variantStats: VariantStats[] = assignments.map((a) => ({
    variant: a.variant,
    count: a._count.variant,
    percentage: totalAssignments > 0 ? (a._count.variant / totalAssignments) * 100 : 0,
  }));

  return {
    experimentSlug,
    totalAssignments,
    variantStats,
  };
};
