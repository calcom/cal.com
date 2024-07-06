import type { NewBookingEventType } from "./types";

export const selectOrganizerEmail = ({
  organizerEmail,
  useEventTypeDestinationCalendarEmail,
  destinationCalendar,
  secondaryEmailId,
  secondaryEmail,
}: {
  organizerEmail: string;
  useEventTypeDestinationCalendarEmail: boolean;
  destinationCalendar: NewBookingEventType["destinationCalendar"];
  secondaryEmailId: NewBookingEventType["secondaryEmailId"];
  secondaryEmail: NewBookingEventType["secondaryEmail"];
}) => {
  if (useEventTypeDestinationCalendarEmail && destinationCalendar?.[0]?.primaryEmail) {
    return destinationCalendar[0].primaryEmail;
  } else if (secondaryEmailId && secondaryEmail?.email) {
    return secondaryEmail.email;
  }

  return organizerEmail || "Email-less";
};
