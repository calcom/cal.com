import { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerRequestedToRescheduleEmail = (
  props: React.ComponentProps<typeof OrganizerScheduledEmail>
) => (
  <OrganizerScheduledEmail
    title={props.calEvent.organizer.language.translate("request_reschedule_title_organizer", {
      attendee: props.calEvent.attendees[0].name,
    })}
    subtitle={
      <>
        {props.calEvent.organizer.language.translate("request_reschedule_subtitle_organizer", {
          attendee: props.calEvent.attendees[0].name,
        })}
      </>
    }
    headerType="calendarCircle"
    subject="rescheduled_event_type_subject"
    callToAction={null}
    {...props}
  />
);
