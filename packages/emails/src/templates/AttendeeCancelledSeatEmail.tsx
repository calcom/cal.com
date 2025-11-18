import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

interface AttendeeCancelledSeatEmailProps extends React.ComponentProps<typeof AttendeeScheduledEmail> {
  isCancelledByHost?: boolean;
}

export const AttendeeCancelledSeatEmail = ({
  isCancelledByHost,
  ...props
}: AttendeeCancelledSeatEmailProps) => {
  // Use different title and subject based on who initiated the cancellation
  const title = isCancelledByHost ? "event_cancelled" : "no_longer_attending";
  const subject = isCancelledByHost ? "event_cancelled_subject" : "event_no_longer_attending_subject";

  return (
    <AttendeeScheduledEmail
      {...props}
      title={title}
      headerType="xCircle"
      subject={subject}
      subtitle=""
      callToAction={null}
    />
  );
};
