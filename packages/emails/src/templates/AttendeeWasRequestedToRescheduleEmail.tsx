import { CallToAction, CallToActionTable } from "../components";
import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const AttendeeWasRequestedToRescheduleEmail = (
  props: { metadata: { rescheduleLink: string } } & React.ComponentProps<typeof OrganizerScheduledEmail>
) => {
  const t = props.attendee.language.translate;
  return (
    <OrganizerScheduledEmail
      t={t}
      title="request_reschedule_title_attendee"
      subtitle={
        <>
          {t("request_reschedule_subtitle", {
            organizer: props.calEvent.organizer.name,
          })}
        </>
      }
      headerType="calendarCircle"
      subject="rescheduled_event_type_subject"
      callToAction={
        <CallToActionTable>
          <CallToAction label="Book a new time" href={props.metadata.rescheduleLink} endIconName="linkIcon" />
        </CallToActionTable>
      }
      {...props}
    />
  );
};
