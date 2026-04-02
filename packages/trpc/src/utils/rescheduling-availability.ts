import { getAvailability } from "@calcom/features/bookings/lib/get-availability"; // Corrected import
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client"; // Use Prisma client type for EventType

export interface ReschedulingAvailabilityParams {
  hostUserId: number;
  guestEmail: string;
  eventType: EventType; // Full event type object is likely needed by getAvailability
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
  const host = await prisma.user.findUnique({
    where: { id: hostUserId },
    select: { id: true, email: true, timeZone: true }, // Need email and timeZone for getAvailability
  });

  if (!host) {
    console.error(`[getReschedulingAvailableSlots] Host user with ID ${hostUserId} not found.`);
    return [];
  }

  // Fetch host availability first (always needed)
  let hostSlots: string[] = [];
  try {
    const rawHostSlots = await getAvailability({
      eventType,
      user: host, // Pass the full user object with id, email, timeZone
      dateFrom,
      dateTo,
      timeZone: timeZone, // Use the provided timezone for calculations
    });
    hostSlots = rawHostSlots.map((d) => d.toISOString());
  } catch (error) {
    console.error("[getReschedulingAvailableSlots] Failed to fetch host availability:", String(error)); // Sanitized logging
    return [];
  }

  // Check if guest is a Cal.com user by email
  const guestUser = await prisma.user.findUnique({
    where: { email: guestEmail },
    select: { id: true, email: true, timeZone: true }, // Need email and timeZone for getAvailability
  });

  // If guest is not a Cal.com user, return host slots (original behavior)
  if (!guestUser) {
    return hostSlots;
  }

  // Guest is a Cal.com user: fetch their availability
  let guestSlots: string[] = [];
  try {
    const rawGuestSlots = await getAvailability({
      eventType,
      user: guestUser, // Pass the full user object with id, email, timeZone
      dateFrom,
      dateTo,
      timeZone: timeZone, // Use the provided timezone for calculations
    });
    guestSlots = rawGuestSlots.map((d) => d.toISOString());
  } catch (error) {
    console.error("[getReschedulingAvailableSlots] Failed to fetch guest availability:", String(error)); // Sanitized logging
    // If guest availability fetch fails, fallback to host slots (safer than blocking rescheduling)
    return hostSlots;
  }

  // Intersect host and guest slots (only slots available for both)
  const availableSet = new Set(guestSlots);
  const intersectedSlots = hostSlots.filter((slot) => availableSet.has(slot));

  return intersectedSlots;
}