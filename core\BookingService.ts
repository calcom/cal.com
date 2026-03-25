/**
 * Core booking service - handles optional guests
 * This modifies the attendee list to include optional guests
 * without performing conflict checks for them
 */

import type { Attendee } from "@calcom/types/Calendar";

/**
 * Adds optional guests to booking attendees
 * These are marked as optional and their calendars are NOT checked for availability
 */
export function addOptionalGuestsToAttendees(
  currentAttendees: Attendee[],
  optionalGuests: Array<{
    id: number;
    name: string | null;
    email: string;
  }>,
  timeZone: string = "UTC"
): Attendee[] {
  const optionalAttendees: Attendee[] = optionalGuests.map((guest) => ({
    email: guest.email,
    name: guest.name ?? guest.email,
    timeZone,
    // Mark as optional - this tells calendar providers this is an optional attendee
    optional: true,
    language: { translate: (key: string) => key, locale: "en" },
  }));

  return [...currentAttendees, ...optionalAttendees];
}
