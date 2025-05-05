import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

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
  const { id, name, activeFilters, sorting, columnVisibility, columnSizing, perPage, searchTerm } = input;
  const userId = ctx.user.id;

  // First, fetch the existing segment to check permissions
  const existingSegment = await prisma.filterSegment.findFirst({
    where: {
      id,
      ...(input.scope === "TEAM"
        ? {
            scope: "TEAM",
            teamId: input.teamId,
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
    data: {
      name,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      perPage,
      searchTerm,
    },
  });

  return updatedSegment;
};
