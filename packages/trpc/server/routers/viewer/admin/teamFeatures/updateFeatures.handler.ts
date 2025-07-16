import { CachedFeaturesRepository } from "@calcom/features/flags/features.repository.cached";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TUpdateFeaturesInputSchema } from "./updateFeatures.schema";

type UpdateFeaturesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateFeaturesInputSchema;
};

export const updateFeaturesHandler = async ({ ctx, input }: UpdateFeaturesOptions) => {
  const { teamId, features } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamFeatures.deleteMany({
      where: { teamId },
    });

    const enabledFeatures = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([featureId]) => ({
        teamId,
        featureId,
        assignedBy: ctx.user.email || "admin",
      }));

    if (enabledFeatures.length > 0) {
      await tx.teamFeatures.createMany({
        data: enabledFeatures,
      });
    }
  });

  const featuresRepo = new CachedFeaturesRepository();
  await featuresRepo.invalidateCache(undefined, teamId);

  return { success: true };
};

export default updateFeaturesHandler;
