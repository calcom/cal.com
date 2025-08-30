import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeDeclinedEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title={
      props.calEvent.recurringEvent?.count ? "event_request_declined_recurring" : "event_request_declined"
    }
    headerType="xCircle"
    subject="event_declined_subject"
    callToAction={null}
    {...props}
  />
);
