import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerCancelledEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const title = props.reassigned ? "event_request_reassigned" : "event_request_cancelled";
  const subject = props.reassigned ? "event_reassigned_subject" : "event_cancelled_subject";
  return (
    <OrganizerScheduledEmail
      title={title}
      headerType="xCircle"
      subject={subject}
      callToAction={null}
      reassigned={props.reassigned}
      {...props}
    />
  );
};
