import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeRequestEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title={props.calEvent.organizer.language.translate(
      props.recurringEvent?.count ? "booking_submitted_recurring" : "booking_submitted"
    )}
    subtitle={props.calEvent.organizer.language.translate(
      props.recurringEvent.count
        ? "user_needs_to_confirm_or_reject_booking_recurring"
        : "user_needs_to_confirm_or_reject_booking",
      { user: props.calEvent.organizer.name }
    )}
    headerType="calendarCircle"
    subject="booking_submitted_subject"
    {...props}
  />
);
