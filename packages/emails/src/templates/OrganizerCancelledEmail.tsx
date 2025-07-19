import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerCancelledEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const t = props.teamMember?.language.translate || props.calEvent.organizer.language.translate;
  const title = props.reassigned ? "event_request_reassigned" : "event_request_cancelled";
  const subtitle = props.reassigned ? t("event_reassigned_subtitle") : "";
  const subject = props.reassigned ? "event_reassigned_subject" : "event_cancelled_subject";
  return (
    <OrganizerScheduledEmail
      title={title}
      subtitle={subtitle}
      headerType="xCircle"
      subject={subject}
      callToAction={null}
      reassigned={props.reassigned}
      {...props}
    />
  );
};
