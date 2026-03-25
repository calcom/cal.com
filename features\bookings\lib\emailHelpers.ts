/**
 * For iCal invites, optional attendees use the ROLE parameter
 * ROLE=OPT-PARTICIPANT for optional attendees
 * 
 * In existing iCal generation code, add ROLE parameter for optional attendees
 */

// In the attendee VCALENDAR component:
// For optional attendees: ATTENDEE;ROLE=OPT-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:optional@example.com
// For required attendees: ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:required@example.com

const formatICalAttendee = (attendee: {
  email: string;
  name?: string;
  optional?: boolean;
}) => {
  const role = attendee.optional ? "OPT-PARTICIPANT" : "REQ-PARTICIPANT";
  return `ATTENDEE;ROLE=${role};CN="${attendee.name ?? attendee.email}";PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`;
};
