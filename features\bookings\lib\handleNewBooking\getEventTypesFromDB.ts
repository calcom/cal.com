import { prisma } from "@calcom/prisma";

/**
 * Extended event type query to include optional guests
 * Add optionalGuests to the select/include in the existing query
 */
export const getEventTypeData = async (eventTypeId: number) => {
  return await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: {
      // ... existing includes ...
      optionalGuests: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
      },
    },
  });
};
