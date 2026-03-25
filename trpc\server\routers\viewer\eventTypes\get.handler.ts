import type { PrismaClient } from "@calcom/prisma";
import type { TRPCContext } from "@calcom/trpc/server/createContext";

/**
 * Update the get handler to include optionalGuests in the response
 * Find the existing eventType query and add optionalGuests to the include
 */

export const getEventTypeWithOptionalGuests = async (
  prisma: PrismaClient,
  eventTypeId: number
) => {
  return prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: {
      // ... existing includes ...
      optionalGuests: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
    },
  });
};
