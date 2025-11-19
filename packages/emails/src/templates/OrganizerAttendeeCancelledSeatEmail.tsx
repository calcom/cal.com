import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

interface OrganizerAttendeeCancelledSeatEmailProps
  extends React.ComponentProps<typeof OrganizerScheduledEmail> {
  isCancelledByHost?: boolean;
}

export const OrganizerAttendeeCancelledSeatEmail = ({
  isCancelledByHost,
  ...props
}: OrganizerAttendeeCancelledSeatEmailProps) => {
  const t = props.teamMember?.language.translate || props.calEvent.organizer.language.translate;

  const title = isCancelledByHost ? "attendee_was_removed" : "attendee_no_longer_attending";
  const subtitleKey = isCancelledByHost ? "attendee_was_removed_subtitle" : "attendee_has_cancelled_subtitle";

  const attendeeName = props.attendee?.name || t("guest");

  return (
    <OrganizerScheduledEmail
      {...props}
      title={title}
      headerType="xCircle"
      subject="event_cancelled_subject"
      subtitle={<>{t(subtitleKey, { attendees: attendeeName })}</>}
      callToAction={null}
      attendeeCancelled
    />
  );
};
