/**
 * This file is part of the handleNewBooking flow.
 * 
 * Ensure eventType query includes optionalGuests:
 */

import { prisma } from "@calcom/prisma";

export const getEventTypeForBooking = async (eventTypeId: number) => {
  return prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
    select: {
      id: true,
      title: true,
      length: true,
      teamId: true,
      // ... all other existing selects ...
      
      // NEW: Include optional guests
      optionalGuests: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
        },
      },
    },
  });
};
