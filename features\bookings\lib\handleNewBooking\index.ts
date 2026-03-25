/**
 * Complete integration of optional guests in the booking flow
 * 
 * Key sections to modify in the existing handleNewBooking function:
 * 
 * 1. When loading event type data - include optionalGuests
 * 2. When building the calendar event - add optional guests as optional attendees  
 * 3. Skip availability checking for optional guests
 */

// ============================================================
// SECTION 1: In the eventType query, add:
// ============================================================
/*
const eventType = await prisma.eventType.findUnique({
  where: { id: eventTypeId },
  include: {
    // ... existing includes ...
    optionalGuests: {
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
      },
    },
  },
});
*/

// ============================================================
// SECTION 2: When building attendees for the calendar event
// ============================================================
/*
// After building regular attendees (bookingAttendees):
const optionalGuestAttendees = (eventType.optionalGuests ?? []).map((guest) => ({
  name: guest.name ?? guest.email,
  email: guest.email,
  timeZone: reqBody.timeZone || "UTC",
  optional: true, // Mark as optional attendee
  language: { translate: tGuests, locale: "en" },
}));

// Add to the calendar event attendees
calEvent.attendees = [...calEvent.attendees, ...optionalGuestAttendees];
*/

// ============================================================
// SECTION 3: Conflict checking - SKIP optional guests
// ============================================================
/*
// When collecting user credentials for availability checking,
// filter out optional guests:
const optionalGuestIds = (eventType.optionalGuests ?? []).map((g) => g.id);

// In the existing code that collects user availability, 
// add a filter like:
const usersToCheckAvailability = allRelevantUsers.filter(
  (user) => !optionalGuestIds.includes(user.id)
);
*/

export const addOptionalGuestsToCalEvent = (
  calEvent: {
    attendees: Array<{
      name: string;
      email: string;
      timeZone: string;
      language: { translate: (key: string) => string; locale: string };
      optional?: boolean;
    }>;
  },
  optionalGuests: Array<{
    name: string | null;
    email: string;
  }>,
  timeZone: string,
  translate: (key: string) => string
) => {
  const optionalAttendees = optionalGuests.map((guest) => ({
    name: guest.name ?? guest.email,
    email: guest.email,
    timeZone,
    optional: true,
    language: {
      translate,
      locale: "en",
    },
  }));

  return {
    ...calEvent,
    attendees: [...calEvent.attendees, ...optionalAttendees],
  };
};
