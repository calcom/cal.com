import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerReassignedEmail = (props: React.ComponentProps<typeof OrganizerScheduledEmail>) => {
  const t = props.teamMember?.language.translate || props.calEvent.organizer.language.translate;
  return (
    <OrganizerScheduledEmail
      title="event_request_reassigned"
      headerType="xCircle"
      subject="event_reassigned_subject"
      subtitle={<>{t("event_reassigned_subtitle")}</>}
      callToAction={null}
      reassigned={props.reassigned}
      {...props}
    />
  );
};
