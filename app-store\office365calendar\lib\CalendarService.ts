/**
 * Modification to Office 365 calendar service to support optional attendees
 * 
 * Microsoft Graph API uses "type" field in attendees:
 * - "required" for required attendees  
 * - "optional" for optional attendees
 */

// In the existing attendee formatting:
const formatAttendeeForMicrosoft = (attendee: {
  email: string;
  name?: string;
  optional?: boolean;
}) => {
  return {
    emailAddress: {
      address: attendee.email,
      name: attendee.name ?? attendee.email,
    },
    type: attendee.optional ? "optional" : "required",
  };
};
