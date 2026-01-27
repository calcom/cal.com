import { getFormattedDate } from "../../lib/utils/date-formatting";
import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeRequestEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => {
  const date = getFormattedDate(props.calEvent, props.attendee);

  return (
    <AttendeeScheduledEmail
      title={props.calEvent.attendees[0].language.translate(
        props.calEvent.recurringEvent?.count ? "booking_submitted_recurring" : "booking_submitted"
      )}
      subtitle={
        <>
          {props.calEvent.attendees[0].language.translate(
            props.calEvent.recurringEvent?.count
              ? "user_needs_to_confirm_or_reject_booking_recurring"
              : "user_needs_to_confirm_or_reject_booking",
            { user: props.calEvent.organizer.name, interpolation: { escapeValue: false } }
          )}
        </>
      }
      headerType="calendarCircle"
      subject={props.calEvent.attendees[0].language.translate("booking_submitted_subject", {
        title: props.calEvent.title,
        date,
      })}
      {...props}
    />
  );
};
