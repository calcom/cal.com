import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamRemoveFeatureSchema } from "./removeFeature.schema";

type RemoveFeatureOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TTeamRemoveFeatureSchema;
};

export default async function handler({ ctx, input }: RemoveFeatureOptions) {
  const { prisma } = ctx;
  const { teamId, featureId } = input;

  const existingAssignment = await prisma.teamFeatures.findUnique({
    where: {
      teamId_featureId: {
        teamId,
        featureId,
      },
    },
  });

  if (!existingAssignment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature assignment not found",
    });
  }

  await prisma.teamFeatures.delete({
    where: {
      teamId_featureId: {
        teamId,
        featureId,
      },
    },
  });

  return { success: true };
}
