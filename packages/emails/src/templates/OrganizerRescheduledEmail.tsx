import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRescheduledEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="event_has_been_rescheduled"
    headerType="calendarCircle"
    subject="event_type_has_been_rescheduled_on_time_date"
    {...props}
  />
);
