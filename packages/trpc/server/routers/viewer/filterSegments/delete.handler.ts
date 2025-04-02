import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteFilterSegmentInputSchema } from "./delete.schema";

export const deleteHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFilterSegmentInputSchema;
}) => {
  const { id } = input;
  const userId = ctx.user.id;

  // First, fetch the existing segment to check permissions
  const existingSegment = await prisma.filterSegment.findFirst({
    where: {
      id,
      OR: [
        {
          scope: "TEAM",
          teamId: { not: null },
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
        },
        {
          scope: "USER",
          userId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!existingSegment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Filter segment not found or you don't have permission to delete it",
    });
  }

  // Delete the filter segment
  await prisma.filterSegment.delete({
    where: { id },
  });

  return {
    id,
    message: "Filter segment deleted successfully",
  };
};
