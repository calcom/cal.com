import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeRescheduledEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="event_has_been_rescheduled"
    headerType="calendarCircle"
    subject="rescheduled_event_type_subject"
    {...props}
  />
);
