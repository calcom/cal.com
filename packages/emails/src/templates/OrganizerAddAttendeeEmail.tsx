import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerAddAttendeeEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="new_attendee_added"
    headerType="calendarCircle"
    subject="attendee_added_event_type_subject"
    callToAction={null}
    {...props}
  />
);
