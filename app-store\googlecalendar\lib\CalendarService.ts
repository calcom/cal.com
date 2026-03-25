/**
 * Modified calendar service to support optional attendees
 * Google Calendar uses "optional: true" in the attendees array
 * 
 * In the existing createEvent method, attendees marked with optional: true
 * should be mapped to Google's attendee format with optional: true
 */

// In the existing createEvent or similar method, modify attendee mapping:
const mapAttendee = (attendee: CalendarServiceAttendee) => {
  const base = {
    email: attendee.email,
    displayName: attendee.name,
  };
  
  // If the attendee is marked as optional, include that in the Google Calendar format
  if (attendee.optional) {
    return { ...base, optional: true };
  }
  
  return base;
};
