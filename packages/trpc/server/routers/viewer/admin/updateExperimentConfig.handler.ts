import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TUpdateExperimentConfigSchema } from "./updateExperimentConfig.schema";

type UpdateExperimentConfigOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateExperimentConfigSchema;
};

export default async function updateExperimentConfigHandler({ ctx, input }: UpdateExperimentConfigOptions) {
  const { prisma } = ctx;

  const feature = await prisma.feature.findUnique({
    where: { slug: input.slug },
    select: { type: true },
  });

  if (!feature || feature.type !== "EXPERIMENT") {
    throw new Error("Feature is not an experiment");
  }

  await prisma.feature.update({
    where: { slug: input.slug },
    data: {
      metadata: input.metadata,
      updatedAt: new Date(),
    },
  });

  return { success: true };
}
