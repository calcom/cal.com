import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeUpdatedEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="event_has_been_updated"
    headerType="calendarCircle"
    subject="event_type_has_been_updated"
    {...props}
  />
);
