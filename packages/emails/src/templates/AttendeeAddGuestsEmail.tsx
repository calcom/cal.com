import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeAddGuestsEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="new_guests_added"
    headerType="calendarCircle"
    subject="guests_added_event_type_subject"
    {...props}
  />
);
