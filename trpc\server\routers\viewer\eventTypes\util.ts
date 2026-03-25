/**
 * Utility functions for event type operations
 * Add helper for processing optional guests
 */

import type { PrismaClient } from "@calcom/prisma";

/**
 * Updates optional guests for an event type
 * Only allows team members to be added as optional guests
 */
export async function updateOptionalGuests(
  prisma: PrismaClient,
  eventTypeId: number,
  optionalGuestIds: number[],
  teamId: number | null
) {
  if (!teamId || optionalGuestIds.length === 0) {
    // Remove all optional guests
    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: {
        optionalGuests: {
          set: [],
        },
      },
    });
    return;
  }

  // Verify all guests are team members
  const teamMemberships = await prisma.membership.findMany({
    where: {
      teamId,
      userId: { in: optionalGuestIds },
    },
    select: { userId: true },
  });

  const validGuestIds = teamMemberships.map((m) => m.userId);

  await prisma.eventType.update({
    where: { id: eventTypeId },
    data: {
      optionalGuests: {
        set: validGuestIds.map((id) => ({ id })),
      },
    },
  });
}
