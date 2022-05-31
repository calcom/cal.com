import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeCancelledEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="event_request_cancelled"
    headerType="xCircle"
    headTitle="event_cancelled_subject"
    callToAction={null}
    {...props}
  />
);

export default AttendeeCancelledEmail;
