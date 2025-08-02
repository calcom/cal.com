import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeCancelledSeatEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => {
  const title = props.isCancelledByHost ? "event_request_cancelled" : "no_longer_attending";
  return (
    <AttendeeScheduledEmail
      title={title}
      headerType="xCircle"
      subject="event_no_longer_attending_subject"
      subtitle=""
      callToAction={null}
      {...props}
    />
  );
};
