import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerAddGuestsEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="new_guests_added"
    headerType="calendarCircle"
    subject="guests_added_event_type_subject"
    callToAction={null}
    {...props}
  />
);
