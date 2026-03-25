/**
 * Availability checking - ensure optional guests are excluded
 * 
 * When collecting users to check availability for,
 * filter out any users who are only optional guests.
 */

import { prisma } from "@calcom/prisma";

/**
 * Returns the IDs of users who should be EXCLUDED from availability checking
 * because they are configured as optional guests for this event type.
 */
export async function getOptionalGuestIdsForEventType(
  eventTypeId: number
): Promise<Set<number>> {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      optionalGuests: {
        select: { id: true },
      },
    },
  });

  return new Set(eventType?.optionalGuests.map((g) => g.id) ?? []);
}

/**
 * Filters a list of user IDs to exclude optional guests
 * These users won't have their availability checked
 */
export function filterOutOptionalGuests(
  userIds: number[],
  optionalGuestIds: Set<number>
): number[] {
  return userIds.filter((id) => !optionalGuestIds.has(id));
}
