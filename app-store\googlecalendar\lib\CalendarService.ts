/**
 * Modification to Google Calendar service to support optional attendees
 * 
 * In the existing createEvent method, when building the attendees list,
 * check for the optional flag and include it in the Google Calendar API call
 */

// The Google Calendar API supports optional attendees via:
// { email: "user@example.com", optional: true }

// In the existing mapAttendeeToGoogleFormat function or equivalent:
const formatAttendeeForGoogle = (attendee: {
  email: string;
  name?: string;
  optional?: boolean;
}) => {
  return {
    email: attendee.email,
    displayName: attendee.name,
    ...(attendee.optional && { optional: true }),
  };
};
