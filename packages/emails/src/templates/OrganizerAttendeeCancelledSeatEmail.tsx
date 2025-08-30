import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerAttendeeCancelledSeatEmail = (
  props: React.ComponentProps<typeof OrganizerScheduledEmail>
) => (
  <OrganizerScheduledEmail
    title="attendee_no_longer_attending"
    headerType="xCircle"
    subject="event_cancelled_subject"
    callToAction={null}
    attendeeCancelled
    {...props}
  />
);
