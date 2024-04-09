import type { CalendarEvent } from "@calcom/types/Calendar";

// formatCalEvent to remove platformClientId from email addresses
export const formatCalEvent = (calEvent: CalendarEvent) => {
  const attendees = calEvent.platformClientId
    ? calEvent.attendees.map((attendee) => ({
        ...attendee,
        email: attendee.email.replace(`+${calEvent.platformClientId}`, ""),
      }))
    : calEvent.attendees;
  const organizer = calEvent.platformClientId
    ? {
        ...calEvent.organizer,
        email: calEvent.organizer.email.replace(`+${calEvent.platformClientId}`, ""),
      }
    : calEvent.organizer;
  return {
    ...calEvent,
    attendees,
    organizer,
  };
};
