/**
 * When creating the final booking and sending calendar invites,
 * include optional guests in the calendar event.
 * 
 * IMPORTANT: Optional guests receive invites but:
 * 1. Their calendars are NOT checked for conflicts
 * 2. They are marked as "optional" in the invite
 */

import type { CalendarEvent } from "@calcom/types/Calendar";

export function enrichCalEventWithOptionalGuests(
  calEvent: CalendarEvent,
  optionalGuests: Array<{
    name: string | null;
    email: string;
    timeZone?: string | null;
  }>,
  defaultTimeZone: string
): CalendarEvent {
  if (!optionalGuests || optionalGuests.length === 0) {
    return calEvent;
  }

  const optionalAttendees = optionalGuests.map((guest) => ({
    email: guest.email,
    name: guest.name ?? guest.email,
    timeZone: guest.timeZone ?? defaultTimeZone,
    optional: true, // This is the key flag
    language: calEvent.attendees[0]?.language ?? {
      translate: (key: string) => key,
      locale: "en",
    },
  }));

  return {
    ...calEvent,
    attendees: [...calEvent.attendees, ...optionalAttendees],
  };
}
