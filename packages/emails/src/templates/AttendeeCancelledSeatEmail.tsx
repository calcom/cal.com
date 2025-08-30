import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeCancelledSeatEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="no_longer_attending"
    headerType="xCircle"
    subject="event_no_longer_attending_subject"
    subtitle=""
    callToAction={null}
    {...props}
  />
);
