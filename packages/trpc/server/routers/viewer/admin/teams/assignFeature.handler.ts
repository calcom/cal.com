import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamAssignFeatureSchema } from "./assignFeature.schema";

type AssignFeatureOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TTeamAssignFeatureSchema;
};

export default async function handler({ ctx, input }: AssignFeatureOptions) {
  const { prisma, user } = ctx;
  const { teamId, featureId, confirmationSlug } = input;

  if (confirmationSlug !== featureId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Confirmation slug must match feature ID",
    });
  }

  const feature = await prisma.feature.findUnique({
    where: { slug: featureId },
  });

  if (!feature) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature not found",
    });
  }

  const existingAssignment = await prisma.teamFeatures.findUnique({
    where: {
      teamId_featureId: {
        teamId,
        featureId,
      },
    },
  });

  if (existingAssignment) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Feature already assigned to team",
    });
  }

  const teamFeature = await prisma.teamFeatures.create({
    data: {
      teamId,
      featureId,
      assignedAt: new Date(),
      assignedBy: user.id.toString(),
    },
    include: {
      feature: true,
    },
  });

  return teamFeature;
}
