import { getAvailableSlots } from "@calcom/lib/availability";
import { prisma } from "@calcom/prisma";
import dayjs from "@calcom/lib/dayjs";
import { EventType } from "@calcom/types/EventType";

export interface ReschedulingAvailabilityParams {
  hostUserId: number;
  guestEmail: string;
  eventType: EventType;
  dateFrom: Date;
  dateTo: Date;
  timeZone: string;
}

/**
 * Retrieves available slots for rescheduling considering both host and guest availability.
 * If guest is not a Cal.com user, returns host's availability only (fallback to original behavior).
 * Returns string[] of ISO 8601 timestamps (e.g., "2024-01-15T10:00:00.000Z")
 */
export async function getReschedulingAvailableSlots({
  hostUserId,
  guestEmail,
  eventType,
  dateFrom,
  dateTo,
  timeZone,
}: ReschedulingAvailabilityParams): Promise<string[]> {
  // Fetch host availability first (always needed)
  let hostSlots: string[] = [];
  try {
    hostSlots = await getAvailableSlots({
      userId: hostUserId,
      dateFrom,
      dateTo,
      eventType,
      timeZone,
    });
  } catch (error) {
    console.error("Failed to fetch host availability:", error);
    return [];
  }

  // Check if guest is a Cal.com user by email
  const guestUser = await prisma.user.findUnique({
    where: { email: guestEmail },
    select: { id: true },
  });

  // If guest is not a Cal.com user, return host slots (original behavior)
  if (!guestUser) {
    return hostSlots;
  }

  // Guest is a Cal.com user: fetch their availability
  let guestSlots: string[] = [];
  try {
    guestSlots = await getAvailableSlots({
      userId: guestUser.id,
      dateFrom,
      dateTo,
      eventType,
      timeZone,
    });
  } catch (error) {
    console.error("Failed to fetch guest availability:", error);
    // If guest availability fetch fails, fallback to host slots (safer than blocking rescheduling)
    return hostSlots;
  }

  // Intersect host and guest slots (only slots available for both)
  const availableSet = new Set(guestSlots);
  const intersectedSlots = hostSlots.filter((slot) => availableSet.has(slot));

  return intersectedSlots;
}