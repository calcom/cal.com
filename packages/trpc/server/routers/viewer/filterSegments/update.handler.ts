import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TUpdateFilterSegmentInputSchema } from "./update.schema";

export const updateHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateFilterSegmentInputSchema;
}) => {
  const { id, scope, teamId, ...dataToUpdate } = input;
  const userId = ctx.user.id;

  // First, fetch the existing segment to check permissions
  const existingSegment = await prisma.filterSegment.findFirst({
    where: {
      id,
      ...(scope === "TEAM"
        ? {
            scope: "TEAM",
            teamId,
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                  role: {
                    in: ["ADMIN", "OWNER"],
                  },
                },
              },
            },
          }
        : {
            scope: "USER",
            userId,
          }),
    },
    select: {
      id: true,
    },
  });

  if (!existingSegment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Filter segment not found or you don't have permission to update it",
    });
  }

  // Update the filter segment with only the allowed fields
  const updatedSegment = await prisma.filterSegment.update({
    where: { id },
    data: dataToUpdate,
  });

  return updatedSegment;
};
