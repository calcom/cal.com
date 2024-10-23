import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerReassignedEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => (
  <OrganizerScheduledEmail
    title="event_request_reassigned"
    headerType="xCircle"
    subject="event_reassigned_subject"
    callToAction={null}
    {...props}
  />
);
