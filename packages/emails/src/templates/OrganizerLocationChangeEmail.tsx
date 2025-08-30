import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerLocationChangeEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="event_location_changed"
    headerType="calendarCircle"
    subject="location_changed_event_type_subject"
    callToAction={null}
    {...props}
  />
);
