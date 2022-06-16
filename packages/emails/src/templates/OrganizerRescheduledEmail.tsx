import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRescheduledEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="event_has_been_rescheduled"
    headerType="calendarCircle"
    subject="rescheduled_event_type_subject"
    {...props}
  />
);
