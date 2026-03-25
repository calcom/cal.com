/**
 * Modify the busy times checker to exclude optional guests
 * Optional guests should never have their calendars checked for availability
 * 
 * The key change: when getting credentials for conflict checking,
 * we exclude users who are only optional guests for this event type
 */

import { prisma } from "@calcom/prisma";

/**
 * Gets the user IDs that should be excluded from conflict checking
 * because they are optional guests for this event type
 */
export async function getOptionalGuestUserIds(eventTypeId: number): Promise<number[]> {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      optionalGuests: {
        select: { id: true },
      },
    },
  });

  return eventType?.optionalGuests.map((g) => g.id) ?? [];
}
