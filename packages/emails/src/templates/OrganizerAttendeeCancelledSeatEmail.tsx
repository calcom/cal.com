import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerAttendeeCancelledSeatEmail = (
  props: React.ComponentProps<typeof OrganizerScheduledEmail>
) => {
  return (
    <OrganizerScheduledEmail
      title="attendee_no_longer_attending"
      headerType="xCircle"
      subject="event_cancelled_subject"
      callToAction={null}
      attendeeCancelled={!props.isCancelledByHost}
      {...props}
    />
  );
};
