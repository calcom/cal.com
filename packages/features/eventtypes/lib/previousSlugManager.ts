import { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

interface RemovePreviousSlugProps {
  userId?: number[] | number;
  teamId?: number | null;
  previousSlug: string;
}

/**
 * Removes the previous slug from event types based on the provided parameters.
 * If userId is an array, it removes the previousSlug from event types associated with the specified userIds.
 * If teamId is provided, it removes the previousSlug from event types associated with the specified teamId.
 * If userId is provided, it removes the previousSlug from event types associated with the specified userId .
 *
 * @param {RemovePreviousSlugProps} props - The properties for removing the previous slug.
 * @returns {Promise<void>} - A promise that resolves when the previous slug is successfully removed.
 * @throws {Error} - If an error occurs during the removal process.
 */
export async function removePreviousSlug({ userId, teamId, previousSlug }: RemovePreviousSlugProps) {
  if (!previousSlug) return;

  if (Array.isArray(userId)) {
    try {
      await prisma.eventType.updateMany({
        where: {
          userId: {
            in: userId,
          },
          previousSlug,
        },
        data: { previousSlug: null },
      });
    } catch (e) {
      throw new Error("Failed to remove previous slug");
    }
  } else {
    try {
      const updateWhere: Prisma.EventTypeWhereUniqueInput = teamId
        ? { teamId_previousSlug: { teamId, previousSlug } }
        : { userId_previousSlug: { userId: userId || -1, previousSlug } };
      await prisma.eventType.update({
        where: updateWhere,
        data: { previousSlug: null },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
    }
  }
}
