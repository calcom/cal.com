import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCreateFilterSegmentInputSchema } from "./create.schema";

export const createHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateFilterSegmentInputSchema;
}) => {
  const { scope, teamId, ...filterData } = input;
  const userId = ctx.user.id;

  // If scope is TEAM, verify user has admin/owner permissions
  if (scope === "TEAM") {
    if (!teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Team ID is required for team scope",
      });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a team admin or owner to create team segments",
      });
    }
  }

  // For USER scope, ensure no teamId is provided
  if (scope === "USER" && teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team ID is not allowed for user scope",
    });
  }

  // Create the filter segment
  const filterSegment = await prisma.filterSegment.create({
    data: {
      ...filterData,
      scope,
      ...(scope === "TEAM" ? { teamId } : {}),
      userId,
    },
  });

  return filterSegment;
};
