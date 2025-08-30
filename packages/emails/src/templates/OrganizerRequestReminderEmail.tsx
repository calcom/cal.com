import { OrganizerRequestEmail } from "./OrganizerRequestEmail";

export const OrganizerRequestReminderEmail = (props: React.ComponentProps<typeof OrganizerRequestEmail>) => (
  <OrganizerRequestEmail title="event_still_awaiting_approval" {...props} />
);
