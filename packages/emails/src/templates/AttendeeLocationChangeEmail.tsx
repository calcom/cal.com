import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeLocationChangeEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="event_location_changed"
    headerType="calendarCircle"
    subject="location_changed_event_type_subject"
    {...props}
  />
);
