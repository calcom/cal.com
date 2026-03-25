/**
 * In the existing handleNewBooking function, we need to:
 * 1. NOT check optional guests' calendars for conflicts
 * 2. Add them as optional attendees to the calendar event
 * 
 * Key modifications:
 */

// After getting eventType data, extract optional guests
// const { optionalGuests = [] } = eventType;

// When building attendees list for calendar event:
// 1. Regular attendees go through normal conflict checking
// 2. Optional guests are added AFTER conflict checking, marked as optional

// Example modification to the attendees building section:
const buildAttendeesWithOptionalGuests = (
  mainAttendees: typeof calEvent.attendees,
  optionalGuests: Array<{ name: string | null; email: string }>,
  timeZone: string
) => {
  const optionalAttendees = optionalGuests.map((guest) => ({
    name: guest.name ?? guest.email,
    email: guest.email,
    timeZone,
    optional: true, // Mark as optional
    language: mainAttendees[0]?.language ?? { translate: (k: string) => k, locale: "en" },
  }));

  return [...mainAttendees, ...optionalAttendees];
};
